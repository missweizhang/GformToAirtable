function getData(e) {
  var itemResponses = e.response.getItemResponses();
  return {
   'Timestamp': e.response.getTimestamp(),
//   'Last Name': 'Zhai',
   'First Name': getResponse('1885085454', itemResponses), // getResponse('1885085454', itemResponses), // ['Name'],
   'Grade': getResponseAsString('1545334638', itemResponses),
   'Select Week': getResponseAsString('1411844809', itemResponses),
   'Extended Care': null, //getResponseAsString('503152405', itemResponses),
//   'Street': "home"
  };  
}

/******* Output from Download Questions webapp: ********/
// https://script.google.com/macros/s/AKfycbwPSEBYoJvjEKiPN2SnNsvPg2rpA747xuGHYs-wc6NdfemAB_Q/exec

//index,title,description,type,data-item-id
//0,"Name","",TEXT,1885085454
//1,"","Grade",MULTIPLE_CHOICE,1545334638
//2,"Select Week","",CHECKBOX,1411844809
//3,"Extended Care","",MULTIPLE_CHOICE,503152405

function getResponse(itemid, itemResponses) {
  for (var i in itemResponses) {
    var item = itemResponses[i].getItem();
    if (item.getId() == itemid) {
      return itemResponses[i].getResponse();
    }
  }
  // if itemid is not found in itemResponses
  return null;
}

function getResponseAsString(itemid, itemResponses) {
  for (var i in itemResponses) {
    var item = itemResponses[i].getItem();
    if (item.getId() == itemid) {
      var response = itemResponses[i].getResponse();
      
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
  }
  
  // if itemid is not found in itemResponses
  return null;
}
