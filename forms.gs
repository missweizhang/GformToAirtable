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

// clear all saved links
function deleteLinks() {
  // double check with user
  var ui = FormApp.getUi();
  if (ui.alert("Are you sure you want to delete all links to Airtable?", 
               "This cannot be undone.", 
               ui.ButtonSet.OK_CANCEL)
      == ui.Button.CANCEL) {
    throw "user canceled.";
  }
  
  // delete saved links
  var properties = PropertiesService.getScriptProperties();
  properties.deleteProperty('links');
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
function postToAirtable(data, settings, tableName) {
  tableName = tableName || settings.tableName;
  
  // Airtable API reference:
  var apiDocUrl = 'https://airtable.com/' +settings.appId+ '/api/docs#curl/table:'+tableName+':create';

  // Make a POST request with a JSON payload.
  var options = {
    'muteHttpExceptions': true,
    'method': 'POST',
    'headers': {
      'Authorization': "Bearer " + settings.apiKey, 
      'Content-Type': 'application/json'
    },
    // Convert the JavaScript object to a JSON string.
    'payload' : JSON.stringify({ "fields": data})
  };
  
  var tableUrl = 'https://api.airtable.com/v0/'+settings.appId+'/'+tableName;
  var response = JSON.parse(UrlFetchApp.fetch(tableUrl, options).getContentText());
  Logger.log(tableUrl);
  
  // success
  if (response.hasOwnProperty("id")) {
    return response;
  }
  
  // failure
  if (response.hasOwnProperty("error")) {
    throw response.error;
  }

  // failure?
  return null;
}


// post to one table within each airtable base and handle errors
function postToAirtableHandleErrors(dataOrig, settings, tableName) {
  var data = JSON.parse(JSON.stringify(dataOrig)); // clone object
  var errata = [];                                 // fields failed to parse to Airtable
  var hasNotesField = true;                        // assume true until proven otherwise
  
  var tryAgain = true;
  while( tryAgain )  
  {
    try {
      // record errata in Notes field
      if (hasNotesField && errata.length > 0) {
        data["Notes"]=JSON.stringify({
          errata: errata       // list of fields removed and error messages
        });
      }

      // post to airtable
      var response = postToAirtable(data, settings, tableName); 
      
      // record errata in Errors table, and mark created record (response) incomplete
      if (!hasNotesField && errata.length > 0) {
        var dataForErrors = {
          "Error Type": "UNKNOWN_FIELD_NAME",
          "Error Message": "Unknown field name: \"Notes\"",
          "Errata": JSON.stringify(errata),
          "Table Name": tableName,
          "Attempted Data": JSON.stringify(dataOrig),
          "Status": "partial failure",
        };
        
        // record unique id of partially created record
        dataForErrors[tableName] = response.id;
        if (dataOrig.hasOwnProperty("Timestamp")) { 
          dataForErrors.Timestamp = dataOrig.Timestamp; 
        }
        
        var result = postToAirtableHandleErrors(dataForErrors, settings, 'Errors'); 
        Logger.log(result);
      }
      
      return response;;      
    }
    catch(error) {
      tryAgain = false;

      // not enough info to create record or log error
      if(!error.type || error == "NOT_FOUND" ||        // invalid appId
         error.type == "AUTHENTICATION_REQUIRED" ||    // invalid apiKey
         error.type == "INVALID_PERMISSIONS")          // require at least Editor permissions
      {
        return null;
      }

      // handleable errors: record in errata and try again with bad data removed
      if(error.type == "UNKNOWN_FIELD_NAME") {
        for each (var re in [/Unknown field name: \"(.*)\"/]) {
          var match = error.message.match(re);
          if (match) {
            error.field = match[1];
            error.value = data[error.field];
            Logger.log("Field doesn't exist in table, try again without field \""+error.field+"\"");
            
            // no Airtable column to record errors
            if (error.field == "Notes") {
              hasNotesField = false;
              Logger.log("Error: "+tableName+" has no \"Notes\" column to save errors from create records.");
            }
            else {
              errata.push(error);
            }
            
            // try again with bad data removed
            delete data[error.field];
            tryAgain = true;
          }
        }
      }
      else if(error.type == "INVALID_VALUE_FOR_COLUMN" ||
              error.type == "INVALID_MULTIPLE_CHOICE_OPTIONS") 
      {
        // field name given
        for each (var re in [/Field (.*) can not accept value (.*)/,
                             /Cannot parse value for field (.*)/]) {
          var match = error.message.match(re);
          if (match) {
            error.field = match[1];
            error.value = data[error.field];
            Logger.log("Invalid choice, try again without field \""+error.field+"\"");
            errata.push(error);

            // try again with bad data removed
            delete data[error.field];
            tryAgain = true;
          }
        }
        
        // field name not given
        for each (var re in [/Unknown choice values: (.*)/,
                             /(.*) contains duplicate value. Each record ID must appear only once/]) {
          var match = error.message.match(re);
          if (match) {
            Logger.log("Invalid choice \""+match[1]+"\"");
            // TODO: get field name (key) from invalid value if unique
          }
        }
      }
      else if (error.type != "TABLE_NOT_FOUND") {
        // not trying again
      }
      
      // give up handling error and record error in Errors table
      if (!tryAgain && tableName != 'Errors') {
        Logger.log("Recording unhandlable error: "+error.type + ", " + error.message);
        var dataForErrors = {
          "Error Type": error.type,
          "Error Message": error.message,
          "Table Name": tableName,
          "Attempted Data": JSON.stringify(dataOrig),
          "Status": "failure"
        };
        if (dataOrig.hasOwnProperty("Timestamp")) { 
          dataForErrors.Timestamp = dataOrig.Timestamp; 
        }
        var result = postToAirtableHandleErrors(dataForErrors, settings, 'Errors');
        Logger.log(result);
      }
    }
  } // tryAgain = false;
  return null;
}


// Post response data to airtable base
function postToAirtableBase(e, settings) {
  var data = getData(e, { // Students table
                             '1885085454': 'First Name',
                             '1545334638': 'Grade',
                             '1411844809': 'Select Week',
                             '503152405':  'Extended Care',
                           });
  var student = postToAirtableHandleErrors(data, settings, 'Students');
  Logger.log(student);
}

/******* Output from Download Questions webapp: ********/
// https://script.google.com/macros/s/AKfycbwPSEBYoJvjEKiPN2SnNsvPg2rpA747xuGHYs-wc6NdfemAB_Q/exec

//index,title,description,type,data-item-id
//0,"Name","",TEXT,1885085454
//1,"","Grade",MULTIPLE_CHOICE,1545334638
//2,"Select Week","",CHECKBOX,1411844809
//3,"Extended Care","",MULTIPLE_CHOICE,503152405
