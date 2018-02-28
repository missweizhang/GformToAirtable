/**
 * Runs when the form is open for edit by creator/collaborator.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onOpen(e) {
  // disable edits to submissions until we implement update entry to airtable (TODO)
  var form = FormApp.getActiveForm();
  form.setAllowResponseEdits(false);

  // add a custom menu to the active form to show the add-on sidebar.
  FormApp.getUi()
      .createAddonMenu()
      .addItem('Show Sidebar', 'showSidebar')
      .addToUi();
}

/**
 * Runs when the add-on is installed.
 *
 * @param {object} e The event parameter for a simple onInstall trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode. (In practice, onInstall triggers always
 *     run in AuthMode.FULL, but onOpen triggers may be AuthMode.LIMITED or
 *     AuthMode.NONE).
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Opens a sidebar in the form containing the add-on's user interface for
 * configuring the notifications this add-on will produce.
 */
function showSidebar() {
  var ui = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle('Post to Airtable');
  FormApp.getUi().showSidebar(ui);
}


/**
 * Save sidebar settings to this form's Properties, and update the onFormSubmit
 * trigger as needed.
 *
 * @param {Object} settings An Object containing key-value
 *      pairs to store.
 * @return {String} A url to airtable base.
 */
function saveSettings(settings) {
  // input validation
  if (settings.apiKey.indexOf("key") != 0 ) {
    throw "Settings not saved: invalid API key";
  }
  if (settings.appId.indexOf("app") != 0 ) {
    throw "Settings not saved: invalid app ID";
  }
  if (!settings.tableName ) {
    throw "Settings not saved: empty table name";
  }
  
  // save properties for display
  var properties = PropertiesService.getScriptProperties();
  properties.setProperties(settings);
  
  // save all linked bases
  var linksArray = [];
  var links = properties.getProperty('links');
  if (links) {  // get saved links
    linksArray = JSON.parse(links);
  }
  
  if (linksArray.filter(
    function(link) {
      return link.appId == settings.appId;
    }).length == 0)
  {  // add link if not saved already
    linksArray.push(settings);
  }
  properties.setProperty('links', JSON.stringify(linksArray));
  Logger.log(properties.getProperties());
  
  // add trigger upon form submit
  adjustFormSubmitTrigger();
  
  // url to Airtable base
  var url = 'https://www.airtable.com/'+settings.appId
  return url;
}

/**
 * Queries the User Properties to populate the sidebar UI elements.
 *
 * @return {Object} A collection of Property values used to fill the
 *        configuration sidebar.
 */
function getSettings() {
  var settings = PropertiesService.getScriptProperties().getProperties();
  return settings;
}

function adjustFormSubmitTrigger() {
  var form = FormApp.getActiveForm(); 
//  var ss = SpreadsheetApp.openById(form.getDestinationId());

  // Create a new trigger if doesn't yet exist
  var handlerFunction = 'respondToFormSubmit';
  var triggers = ScriptApp.getUserTriggers(form);
  var existingTrigger = null;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() == handlerFunction &&
        triggers[i].getEventType() == ScriptApp.EventType.ON_FORM_SUBMIT ) {
      existingTrigger = triggers[i];
      break;
    }
  }
  if (!existingTrigger) {
    var trigger = ScriptApp.newTrigger(handlerFunction)
      // tie trigger to form
      .forForm(form)
//      .forSpreadsheet(ss)
      .onFormSubmit()
      .create();
  }
}

function respondToFormSubmit(e) { // trigger from form
  postToAllAirtableBases(e);
}

function respondToFormSubmitForSpreadsheet(e) { // trigger from spreadsheet
  Logger.log(e);
  
  if (e.range.getNotes()[0].join('')) {
    Logger.log("update entry: user edited submission");
    // TODO: search and update airtable entry using e.namedValues['Timestamp'][0]
  }
  else {
    Logger.log("new entry: user submitted form");
    respondToFormSubmit(e);
  }
}
  
function postToAllAirtableBases(e) {
  var settings = getSettings();
  
  if (!settings.links) { // post to only base saved
    postToAirtableBase(e, settings);
  }
  else {                 // post to all bases
    var linksArray = JSON.parse(settings.links);
    for (var i in linksArray) {
      postToAirtableBase(e, linksArray[i]);
    }
  }
}

// post to one table within each airtable base
function postToAirtable(e, tableName, fieldMap, settings) {
  tableName = tableName || settings.tableName;
  
  // Airtable API reference:
  var apiDocUrl = 'https://airtable.com/' +settings.appId+ '/api/docs#curl/table:'+tableName+':create';

  // get data mapped from Google Form's response to Airtable
  var data = { "fields":  getData(e, fieldMap)};
  
  // Make a POST request with a JSON payload.
  var options = {
    'muteHttpExceptions': true,
    'method': 'POST',
    'headers': {
      'Authorization': "Bearer " + settings.apiKey, 
      'Content-Type': 'application/json'
    },
    // Convert the JavaScript object to a JSON string.
    'payload' : JSON.stringify(data)
  };
  
  var tableUrl = 'https://api.airtable.com/v0/'+settings.appId+'/'+tableName;
  var response = UrlFetchApp.fetch(tableUrl, options);
  Logger.log(tableUrl);
  Logger.log(response.getContentText());
  
  // return unique id of record created
  if (response.getContentText().hasOwnProperty("id")) {
    return response.getContentText().id;
  }
  return null;
}


// Post response data to airtable base
function postToAirtableBase(e, settings) {
  var student = postToAirtable(e, 'Students', // the 'Students' table
                               {
                                 '1885085454': 'First Name',
                                 '1545334638': 'Grade',
                                 '1411844809': 'Select Week',
                                 '503152405':  'Extended Care',
                               }, settings);
}

/******* Output from Download Questions webapp: ********/
// https://script.google.com/macros/s/AKfycbwPSEBYoJvjEKiPN2SnNsvPg2rpA747xuGHYs-wc6NdfemAB_Q/exec

//index,title,description,type,data-item-id
//0,"Name","",TEXT,1885085454
//1,"","Grade",MULTIPLE_CHOICE,1545334638
//2,"Select Week","",CHECKBOX,1411844809
//3,"Extended Care","",MULTIPLE_CHOICE,503152405
