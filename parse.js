//http request
var request = require('request');

//setup Parse
var APP_ID = "C7i23Afdrrrr3QHwRxesHbywnBq9FyEbs2CWjMsU";
var REST_API_KEY = "EEqNvhnNpsri0brruF4dJZq4fkGCQmsuCbZOrLl2";
var MASTER_KEY = "fa4d6kTmeMR4l2I9G8bQDHgG62BFBqfbtrXiN3ES";
var Parse = require('node-parse-api').Parse;
var parseApp = new Parse(APP_ID, MASTER_KEY);



//modulized
module.exports = {

    fetchAllActiveRules : function (callback,numberToSkip,allActiveRules){

      allActiveRules = (typeof allActiveRules === "undefined") ? [] : allActiveRules;

       param = encodeURIComponent('where={"alertStatus":"active"}');
         request.get({url:'https://api.parse.com/1/classes/AlertRule?limit=1000&skip='+numberToSkip+'&'+param, 
              headers:{
                  "X-Parse-Application-Id":APP_ID ,
                      "X-Parse-REST-API-Key": REST_API_KEY,
                      "Content-Type": "application/json"
                  }
        }, function (e, r, body) {

          body=JSON.parse(body);
          if(body.results!=undefined){

            allActiveRules = allActiveRules.concat(body.results);

            if(body.results.length==1000){
              module.exports.fetchAllActiveRules(callback,numberToSkip+1000,allActiveRules);
            }
            else{
            
            console.log("got "+allActiveRules.length+" active rules");
            callback(allActiveRules);
            }
          }
        });
    },


    fetchAllStocks: function (callback,numberToSkip,tempArray){

      tempArray = (typeof tempArray === "undefined") ? [] : tempArray;

          param = encodeURIComponent('where={"alertStatus":"active"}');
          request.get({url:'https://api.parse.com/1/classes/AlertRule?order=-createdAt&limit=1000&skip='+numberToSkip+'&'+param, 
              headers:{
                  "X-Parse-Application-Id":APP_ID ,
                      "X-Parse-REST-API-Key": REST_API_KEY,
                      "Content-Type": "application/json"
                  }
        }, function (e, r, body) {

          body=JSON.parse(body);
                 
            if(body.results!=undefined){

                  for(r in body.results){                     
                      tempArray.push(body.results[r].stockSymbol);
                }
                  //need to re code and there's a need to go beyound 10k
                  if(body.results.length==1000){
                      console.log('need next round');
                      module.exports.fetchAllStocks(callback,numberToSkip+1000,tempArray);
                  }else{
                      //remove duplicated elements
                      var allstocksToReturn = tempArray.filter(function(elem, pos) {
                      return tempArray.indexOf(elem) == pos;
                    });

                     console.log( "all stocks: "+allstocksToReturn.length+" stocks");
                     callback(allstocksToReturn);
                }
            }//if
      });


  },//fetchAllStocks

      requestPush:  function (msg,channel,stock){
          console.log(JSON.stringify(stock));
            var currentdate = new Date();
            var sendingtime =currentdate.toLocaleDateString()+" "+ currentdate.toLocaleTimeString();
          request.post(
            {
              url:'https://api.parse.com/1/push',
              headers:{
              "X-Parse-Application-Id":APP_ID ,
                  "X-Parse-REST-API-Key": REST_API_KEY,
                  "Content-Type": "application/json"
              },
              json:{"channels":[channel], "type":"ios","data":{"alert":msg,"sendingDate":sendingtime,"symbol":stock.stockSymbol,"type":stock.ruleType,"operator":stock.ruleOperator,"target":stock.ruleTarget,"objectID":stock.objectId}}
            },
            function(e,r,body){
            console.log('msg sent: ' + msg);
            console.log('body: ' + JSON.stringify(body));
            console.log('error: '+e);
          });
      },//requestPush

      deactivate:function(id){

          parseApp.update('AlertRule', id, { alertStatus: 'inactive' }, function (err, response) {
         });
         },//deactivate

}//end of module