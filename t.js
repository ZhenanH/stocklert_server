
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http') 
  , path = require('path');



var https = require('https');
var request = require('request');
var querystring = require('querystring');

//setup Parse
 var APP_ID = "C7i23Afdrrrr3QHwRxesHbywnBq9FyEbs2CWjMsU";
 var REST_API_KEY = "EEqNvhnNpsri0brruF4dJZq4fkGCQmsuCbZOrLl2";
var MASTER_KEY = "fa4d6kTmeMR4l2I9G8bQDHgG62BFBqfbtrXiN3ES";
var Parse = require('node-parse-api').Parse;
var parseApp = new Parse(APP_ID, MASTER_KEY);


//constants
var yql_url = "http://query.yahooapis.com/v1/public/yql";
var yahoo_url = "http://download.finance.yahoo.com/d/quotes.csv";


var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  //app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});



app.get('/', routes.index);
app.get('/users', user.list);


app.get('/push', function(req,res){   
  requestPush('price alert','yy');
  res.end();
});

app.get('/update', function(req,res){
  stopUpdating();
  fetchAllActiveRules2(function(l){    
    localRules = l;
    fetchAllStocks(function(s){
    startUpdating(s);
  },0);

},0,[]);
  console.log("update stock lists");
  res.end();
});
//fetchRulesAndCompare('');
// variables
var job1;
var monitoringStocks = [];
var localRules; 
// fetchAllActiveRules2(function(l){
// localRules = l;
// fetchAllStocks(function(s){
//   startUpdating(s);
// },0);
// },0,[]);



//startUpdating();
//startUpdating();
//get all unique stocks;

//send push notification
function requestPush(msg,channel,stock){
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
}

function recursive(s){
  //var symbols =["yy", "qihu"];
  //console.log("in recursive "+monitoringStocks);
  setChannel(monitoringStocks);
  console.log("update stock price");
  job1 = setTimeout(recursive,60000);
};

//start job
function startUpdating(){
  console.log("start loop");  
  recursive();
}

//stop job
function stopUpdating(){
  console.log("stop loop");
  clearTimeout(job1);
}

function setChannel(symbols){
  console.log('comparing '+symbols.length+' stocks');
  //get all symbols
  var symbol_string='';
  if(symbols.length<=200){

  for(s in symbols){
    symbol_string +=symbols[s];
    if(s!=symbols.length-1)
      symbol_string+=",";
  }
   
  var yahoo_api = yahoo_url+"?s="+symbol_string+"&f=sl1d1t1c1p2ohgv&e=.csv' and columns='symbol,price,date,time,change,percentage,col1,high,low,col2";  
  var url =  yql_url+"?"+querystring.stringify({q:"select * from csv where url='"+yahoo_api+"'"})+"&format=json";

   
  request.get({url:url},function(e,r,body){

    
    try{
    body = JSON.parse(body);
    
    if(body.query!=null&&body.query!=undefined&&body.query.results!=null)
    {
    var msg = "";
    for(r in body.query.results.row){
      msg =msg + body.query.results.row[r].symbol +": "+body.query.results.row[r].price+"  ";
    }
     //console.log("updating: "+msg);
    
        //caculate rules
        
    //push to channels
    for(r in body.query.results.row){
      fetchLocalRulesAndCompare(body.query.results.row[r],function(v){
        

        if(v.length>0){
          for(c in v){
            if(v[c].ruleOperator==">"||v[c].ruleOperator=="<"){
              requestPush(v[c].stockSymbol+' '+v[c].ruleOperator+' '+v[c].ruleTarget,"c"+v[c].objectId,v[c]);
              //console.log('Price alert: '+v[c].stockSymbol+' price '+v[c].ruleOperator+' '+v[c].ruleTarget+"sending to c"+v[c].objectId+" for "+v[c]);
            }
            if(v[c].ruleOperator=="+"||v[c].ruleOperator=="-"){
              //requestPush('Price alert: '+v[c].stockSymbol+' price '+v[c].ruleOperator+' '+v[c].ruleTarget,"c"+v[c].objectId,v[c]);
              requestPush(v[c].stockSymbol+' '+v[c].ruleOperator+' '+v[c].ruleTarget+"%","c"+v[c].objectId,v[c]);
              //console.log('Price alert: '+v[c].stockSymbol+' day change '+v[c].ruleOperator+' '+v[c].ruleTarget+"% sending to "+"c"+v[c].objectId+" for "+v[c]);
            }
            deactivate(v[c].objectId);
          }
        }
          
      });
    }
          
        }
    }catch(err){
      console.log("parse body crashed");
    }
         
  });
}else{
  setChannel(symbols.slice(0,200));
  setChannel(symbols.slice(200,symbols.length));
}
}

function deactivate(id){

  parseApp.update('AlertRule', id, { alertStatus: 'inactive' }, function (err, response) {
   stopUpdating();
  fetchAllActiveRules2(function(l){    
    localRules = l;
    fetchAllStocks(function(s){
    startUpdating(s);
  },0);

},0,[]);
  console.log(response);
});

}

function fetchAllActiveRules(callback){
  parseApp.findMany('AlertRule', {alertStatus:"active" }, function (err, response) {
        console.log("got "+response.results.length+" results");
    callback(response.results);
  });
}

function fetchAllActiveRules2(callback,numberToSkip,allActiveRules){
  
   param = encodeURIComponent('where={"alertStatus":"active"}');
   request.get({url:'https://api.parse.com/1/classes/AlertRule?limit=1000&skip='+numberToSkip+'&'+param, 
        headers:{
            "X-Parse-Application-Id":APP_ID ,
                "X-Parse-REST-API-Key": REST_API_KEY,
                "Content-Type": "application/json"
            }
  }, function (e, r, body) {

    body=JSON.parse(body);
    allActiveRules = allActiveRules.concat(body.results);

    if(allActiveRules.length==1000){
      fetchAllActiveRules2(callback,1000,allActiveRules)
    }
    else{
    
    console.log("got "+allActiveRules.length+" active rules");
    callback(allActiveRules);
  }
  });
}

function fetchLocalRulesAndCompare(stock,callback){
  //console.log("fetching rules");
var validated = [];

var response ={};
response.results=[];
   //fillter local active rules
   for(l in localRules){
    if(localRules[l].stockSymbol == stock.symbol){
      response.results.push(localRules[l]);

    }
   }
   
  // console.log(response.results.length+" local rules matched");
  //console.log("finding");
  if(response.results.length>0){
  for(s in response.results){
    if(response.results[s].ruleOperator=="<"){
          if(stock.price < response.results[s].ruleTarget){
            validated.push(response.results[s]);
          console.log("going to alert: "+response.results[s].stockSymbol);
      }
    }
    if(response.results[s].ruleOperator==">"){
        if(stock.price > response.results[s].ruleTarget){
            validated.push(response.results[s]);
           console.log("going to alert: "+response.results[s].stockSymbol);
       }
    }
    if(response.results[s].ruleOperator=="+"){
      if(stock.change.indexOf("+")!=-1){
         var abs = parseFloat(stock.percentage.substring(1,stock.percentage.indexOf("%")));
        if(abs > response.results[s].ruleTarget){                   
            validated.push(response.results[s]);
           console.log("going to alert: "+response.results[s].stockSymbol);
          }
      }
    }

    if(response.results[s].ruleOperator=="-"){
      if(stock.change.indexOf("-")!=-1){
         var abs = parseFloat(stock.percentage.substring(1,stock.percentage.indexOf("%")));
        if(abs > response.results[s].ruleTarget){                   
            validated.push(response.results[s]);
           console.log("going to alert: "+response.results[s].stockSymbol);
          }
      }
    }//if
  
  
}//for

}
callback(validated);
 
}


function fetchRulesAndCompare(stock,callback,numberToSkip,rulesToCompare){
  //console.log("fetching rules");
var validated = [];
//parseApp.findMany('AlertRule', { stockSymbol: stock.symbol, alertStatus:"active" }, function (err, response) {

 param = encodeURIComponent('where={"alertStatus":"active",stockSymbol:'+stock.symbol+'}');
   request.get({url:'https://api.parse.com/1/classes/AlertRule?limit=1000&skip='+numberToSkip+'&'+param, 
        headers:{
            "X-Parse-Application-Id":APP_ID ,
                "X-Parse-REST-API-Key": REST_API_KEY,
                "Content-Type": "application/json"
            }
  }, function (e, r, body) {

    body=JSON.parse(body);
    
    rulesToCompare = rulesToCompare.concat(body.results);

if(allActiveRules.length==1000){
      fetchRulesAndCompare(stock,callback,1000,rulesToCompare)
    }
    else{

  //console.log("finding");
  if(response != undefined){
  for(s in response.results){
    if(response.results[s].ruleOperator=="<"){
          if(stock.price < response.results[s].ruleTarget){
            validated.push(response.results[s]);
          console.log("going to alert: "+response.results[s].stockSymbol);
      }
    }
    if(response.results[s].ruleOperator==">"){
        if(stock.price > response.results[s].ruleTarget){
            validated.push(response.results[s]);
           console.log("going to alert: "+response.results[s].stockSymbol);
       }
    }
    if(response.results[s].ruleOperator=="+"){
      if(stock.change.indexOf("+")!=-1){
         var abs = parseFloat(stock.percentage.substring(1,stock.percentage.indexOf("%")));
        if(abs > response.results[s].ruleTarget){                   
            validated.push(response.results[s]);
           console.log("going to alert: "+response.results[s].stockSymbol);
          }
      }
    }

    if(response.results[s].ruleOperator=="-"){
      if(stock.change.indexOf("-")!=-1){
         var abs = parseFloat(stock.percentage.substring(1,stock.percentage.indexOf("%")));
        if(abs > response.results[s].ruleTarget){                   
            validated.push(response.results[s]);
           console.log("going to alert: "+response.results[s].stockSymbol);
          }
      }
    }
  }
}
  
 }//else   
  callback(validated);
});

 
}

function fetchAllStocks(callback,numberToSkip){

    request.get({url:'https://api.parse.com/1/classes/AlertRule?limit=1000&skip='+numberToSkip, 
        headers:{
            "X-Parse-Application-Id":APP_ID ,
                "X-Parse-REST-API-Key": REST_API_KEY,
                "Content-Type": "application/json"
            }
  }, function (e, r, body) {
    body=JSON.parse(body);
    
if(body.results!=undefined){
      //console.log(body.results);
      if(numberToSkip==0){
      var allstocks = [];
      monitoringStocks = [];
     //console.log("now in recursive: "+monitoringStocks);
   }
      for(r in body.results){                     
          monitoringStocks.push(body.results[r].stockSymbol);
    }
        
          

      if(body.results.length==1000)
          {
            //console.log("first: "+monitoringStocks.length);
            fetchAllStocks(callback,1000)
          }
      else{
        allstocks = monitoringStocks.filter(function(elem, pos) {
         return monitoringStocks.indexOf(elem) == pos;
        });
        monitoringStocks = allstocks;
         console.log( "mornitoring: "+monitoringStocks.length+" stocks");
         callback(allstocks);
}
}//if
    });


}



http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
