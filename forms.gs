// User Credentials from Airtable
// https://support.airtable.com/hc/en-us/articles/219046777-How-do-I-get-my-API-key-
// https://community.airtable.com/t/what-is-the-app-id-where-do-i-find-it/2984/2
var api_key = ""; //editor key
var app_id = ""
var table_name = "Partners";


function onOpen() {
  // disable edits to submissions until we implement update entry to airtable (TODO)
  var form = FormApp.getActiveForm();
  form.setAllowResponseEdits(false);

  adjustFormSubmitTrigger();
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
