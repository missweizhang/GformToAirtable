/******* Output from Download Questions webapp: ********/
// https://script.google.com/macros/s/AKfycbwPSEBYoJvjEKiPN2SnNsvPg2rpA747xuGHYs-wc6NdfemAB_Q/exec

//index,title,description,type,data-item-id
//0,"Name","",TEXT,1885085454
//1,"","Grade",MULTIPLE_CHOICE,1545334638
//2,"Select Week for 1st grade","",CHECKBOX,1411844809
//3,"Select Week for 2nd grade","",CHECKBOX,1809533127
//4,"Extended Care","",MULTIPLE_CHOICE,503152405


/**
 * post response data for camptoons form
 */
function postToAirtableBase(e, settings) {
  var data = getData(e, expand({ // Students table
                             '1885085454': 'First Name',
                             '1545334638': 'Grade',
                             '1411844809, 1809533127': 'Select Week',
//                             '1411844809': 'Select Week',
//                             '1809533127': 'Select Week',
                             '503152405':  'Extended Care',
                           }));
  var student = postToAirtableHandleErrors(data, settings, 'Students');
  Logger.log(student);
}

/**
 * Get fields data ready to post to Airtable API's create record
 *
 * @param {object} e The event parameter for a onFormSubmit trigger for Google Form.
 * @param {object} fieldMap A map of Google Form questions' data-item-id to Airtable's field names.
 * @returns {object} result fields ready to post to Airtable API's create record
 */
function getData(e, fieldMap) {
  var itemResponses = e.response.getItemResponses();
  var result = { 'Timestamp': e.response.getTimestamp() };
  
  for (var i in itemResponses) {
    var item = itemResponses[i].getItem();
    // fieldMap has this question
    if (fieldMap.hasOwnProperty(item.getId())) {
      var field = fieldMap[item.getId()];

      // record result
      result[field] = itemResponses[i].getResponse();
    }
  }
  return result;
}

/**
 * Expand object with multiple keys pairing to same value
 * https://stackoverflow.com/questions/14743536/multiple-key-names-same-pair-value
 *
 *  var holidays = expand({
 *     "thanksgiving day, thanksgiving, t-day": {
 *         someValue : "foo"
 *     } 
 * });
 */
function expand(obj) {
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i],
            subkeys = key.split(/,\s?/),
            target = obj[key];
        delete obj[key];
        subkeys.forEach(function(key) { obj[key] = target; })
    }
    return obj;
}

/**************** Helpers *********************/

// Convert response to csv string if response is String[] or String[][]
function getResponseAsString(item, response) {
  switch (item.getType()) {
    case FormApp.ItemType.CHECKBOX:       // String[]
    case FormApp.ItemType.GRID:           // String[]
      return response.join(", ");
    case FormApp.ItemType.CHECKBOX_GRID:  // String[][]
      var csv = ""; // comma separated values
      response.forEach(function(rowArray){
        var row = rowArray.join(", ");
        csv += row + "\r\n";
      });
      return csv;
    default:                              // String
      return response;
  }
}


/**
 * Get response replacing other option with null
 *
 * @param {string} response
 * @returns {string} if response one of the regular valid choices
 *          {null} if response is an "other" option
 *          {String[]} if response is an array of strings
 */
function getResponseWithOtherOption(item, response) {
  if (typeof response != 'string') { // array
    var result = [];
    for each (var r in response) {
      result.push(getResponseWithOtherOption(item, r));
    }
    return result;
  }

  var choices = getChoices(item);
  if (choices && choices.indexOf(response) == -1) {
    // response is an "other" option
    return null; 
  }
  return response;
}

// Determines whether the item has an "other" option.
function hasOtherOption(item) {
  switch (item.getType()) {
    case FormApp.ItemType.MULTIPLE_CHOICE:
    case FormApp.ItemType.CHECKBOX:
      return getItemAsType(item).hasOtherOption();
    default:
      return false;
  }
}

/**
 * Get string array of choices available to a form question that supports choices
 *
 * @param {object} item Question on Google form
 * @returns {String[]} an array of choices if the question supports choices, null otherwise
 */
function getChoices(item) {
  switch (item.getType()) {
    case FormApp.ItemType.LIST:
    case FormApp.ItemType.MULTIPLE_CHOICE:
    case FormApp.ItemType.CHECKBOX:
      return getItemAsType(item).getChoices().map(
        function(choice) { return choice.getValue(); }
      );
    default:
      return null;
  }
}

function getItemAsType(item) {
  switch (item.getType()) {
    case FormApp.ItemType.TEXT:
      return item.asTextItem();
    case FormApp.ItemType.PARAGRAPH_TEXT: 
      return item.asParagraphTextItem();
    case FormApp.ItemType.LIST:
      return item.asListItem();
    case FormApp.ItemType.MULTIPLE_CHOICE:
      return item.asMultipleChoiceItem();
    case FormApp.ItemType.CHECKBOX:
      return item.asCheckboxItem();
    case FormApp.ItemType.GRID:
      return item.asGridItem();
    case FormApp.ItemType.CHECKBOX_GRID:
      return item.asCheckboxGridItem();
    case FormApp.ItemType.SCALE:
      return item.asScaleItem();
    case FormApp.ItemType.DATE:
      return item.asDateItem();
    case FormApp.ItemType.DATETIME:
      return item.asDateTimeItem();
    case FormApp.ItemType.DURATION:
      return item.asDurationItem();
    case FormApp.ItemType.TIME:
      return item.asTimeItem();
      
    default:
      // Not handling IMAGE, PAGE_BREAK, SECTION_HEADER
      return null;
  }
}
