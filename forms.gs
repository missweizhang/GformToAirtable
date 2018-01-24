// User Credentials from Airtable
// https://support.airtable.com/hc/en-us/articles/219046777-How-do-I-get-my-API-key-
// https://community.airtable.com/t/what-is-the-app-id-where-do-i-find-it/2984/2
var api_key = ""; //editor key
var app_id = ""
var table_name = "Partners";


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
 */
function saveSettings(settings) {
  PropertiesService.getDocumentProperties().setProperties(settings);
  adjustFormSubmitTrigger();
}

/**
 * Queries the User Properties to populate the sidebar UI elements.
 *
 * @return {Object} A collection of Property values used to fill the
 *        configuration sidebar.
 */
function getSettings() {
  var settings = PropertiesService.getDocumentProperties().getProperties();

  // Use a default email if the creator email hasn't been provided yet.
  if (!settings.creatorEmail) {
    settings.creatorEmail = Session.getEffectiveUser().getEmail();
  }
  Logger.log(settings.creatorEmail);
  return settings;
}

function adjustFormSubmitTrigger() {
  var form = FormApp.getActiveForm(); 
  var ss = SpreadsheetApp.openById(form.getDestinationId());

  // Create a new trigger if doesn't yet exist
  var handlerFunction = 'respondToFormSubmit';
  var triggers = ScriptApp.getUserTriggers(ss);
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
      // tie trigger to spreadsheet
      .forSpreadsheet(ss)
      .onFormSubmit()
      .create();
  }
}


function respondToFormSubmit(e) { // trigger from spreadsheet
  Logger.log(e);
  
  if (e.range.getNotes()[0].join('')) {
    Logger.log("update entry: user edited submission");
    // TODO: search and update airtable entry using e.namedValues['Timestamp'][0]
  }
  else {
    Logger.log("new entry: user submitted form");
    postToAirtable(e);
  }
}
  

function postToAirtable(e) {
  // Airtable API reference:
  // https://airtable.com/appIXjc654oNlG2GC/api/docs#curl/table:partners:create
  var data = { "fields": {
//   'Last Name': 'Zhai',
   'First Name': e.namedValues['Name'][0],
//   'Street': "home"
  } };
  
  // Make a POST request with a JSON payload.
  var options = {
    'muteHttpExceptions': true,
    'method': 'POST',
    'headers': {
      'Authorization': "Bearer " + api_key, 
      'Content-Type': 'application/json'
    },
    // Convert the JavaScript object to a JSON string.
    'payload' : JSON.stringify(data)
  };
  
  var response = UrlFetchApp.fetch('https://api.airtable.com/v0/'+app_id+'/'+table_name, options);
  Logger.log(response.getContentText());
}
