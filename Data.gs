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
      var response = itemResponses[i].getResponse();
      
      if (typeof response != 'string') {
        response = getResponseAsString(item, response);
      }
      if (hasOtherOption(item)) {
        // set to null if response is an "other" option
        response = getResponseWithOtherOption(item, response);
      }  

      // record result
      result[field] = response;
    }
  }
  return result;
}

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
 * Get string array of choices available to a form question that supports choices
 *
 * @param {string} response
 * @returns {string} if response one of the regular valid choices
 *          {null} if response is an "other" option
 */
function getResponseWithOtherOption(item, response) {
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
