
//parse handle
var parseHandler = require('./parse');
var ruleUtil = require('./rules');
var request = require('request');
var querystring = require('querystring');
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


// Routes
app.get('/', routes.index);
app.get('/users', user.list);


app.get('/update', function(req,res){
  stopUpdating();
  startUpdating(); 
  res.end();
});

app.get('/test', function(req,res){
 
});


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

//regular jobs

var job;
var monitoringStocks=[];
var monitoringSymbols=[];
var cycle = 0;

function recursive(){

  ruleUtil.compareRules(monitoringSymbols,monitoringStocks, function(t){
      
      if(t){
      console.log('undate after deactivate');
      parseHandler.fetchAllActiveRules(function(r){    
        monitoringStocks = r;

          parseHandler.fetchAllStocks(function(s){ 
          monitoringSymbols = s;
        },0);

    },0);
    }//if
  });

  lastUpdate = new Date();
  console.log("update stock price in cycle "+cycle+ ' at '+lastUpdate);
  cycle+=1;
  job= setTimeout(recursive,60000);
};

//start job
function startUpdating(){
  console.log("start loop"); 
  //get all active rules 
  parseHandler.fetchAllActiveRules(function(r){    
    monitoringStocks = r;

    parseHandler.fetchAllStocks(function(s){ 
    monitoringSymbols = s;
  },0);

},0);
  //start looping
  recursive();
}

//stop job
function stopUpdating(){
  console.log("stop loop");
  clearTimeout(job);
}

//go!
startUpdating();




