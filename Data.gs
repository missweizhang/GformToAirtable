function getData(e) {
  Logger.log(e.namedValues);
  return {
//   'Last Name': 'Zhai',
   'First Name': e.namedValues['Name'][0],
//   'Street': "home"
  };  
}