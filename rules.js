
//constants
var yql_url = "http://query.yahooapis.com/v1/public/yql";
var yahoo_url = "http://download.finance.yahoo.com/d/quotes.csv";
//http request
var querystring = require('querystring');
var request = require('request');
var parseHandler = require('./parse');
//modulized
module.exports = {

       compareRules: function(symbols,localRules,start,stop){

       
        //get all symbols
        var symbol_string='';
        if(symbols.length<=200&&symbols.length!=0){

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
                        //console.log('in compare: '+JSON.stringify(body));
                        if(body.query!=null&&body.query!=undefined&&body.query.results!=null)
                            {
                            var msg = "";
                            for(r in body.query.results.row){
                              msg =msg + body.query.results.row[r].symbol +": "+body.query.results.row[r].price+"  ";
                            }
                            
                                
                                    //push to channels
                                    for(r in body.query.results.row){
                                      module.exports.validateRule(body.query.results.row[r],function(v){
                                        

                                        if(v.length>0){
                                          for(c in v){
                                            if(v[c].ruleOperator==">"||v[c].ruleOperator=="<"){
                                              //parseHandler.requestPush(v[c].stockSymbol+' '+v[c].ruleOperator+' '+v[c].ruleTarget,"c"+v[c].objectId,v[c]);
                                              console.log('Price alert: '+v[c].stockSymbol+' price '+v[c].ruleOperator+' '+v[c].ruleTarget+" sending to c"+v[c].objectId);
                                            }
                                            if(v[c].ruleOperator=="+"||v[c].ruleOperator=="-"){
                                              //parseHandler.requestPush(v[c].stockSymbol+' '+v[c].ruleOperator+' '+v[c].ruleTarget+"%","c"+v[c].objectId,v[c]);
                                              console.log('Price alert: '+v[c].stockSymbol+' day change '+v[c].ruleOperator+' '+v[c].ruleTarget+"% sending to "+"c"+v[c].objectId);
                                            }
                                            parseHandler.deactivate(v[c].objectId);
                                          }
                                        }
                                          
                                      },localRules);
                                    }
                                  
                                }
                    }catch(err){
                      console.log("parse body crashed");
                      console.log(err);
                    }
                     
              });
      }else if(symbols.length>200){
        module.exports.compareRules(symbols.slice(0,200),localRules,start,stop);
        module.exports.compareRules(symbols.slice(200,symbols.length),localRules,start,stop);
      }
      //update localrules
      stop;
      start;
    },//compareRules



       validateRule: function(stock,callback,localRules){

      var validated = [];

      var response ={};
      response.results=[];

         //fillter local active rules
         for(l in localRules){
          if(localRules[l].stockSymbol == stock.symbol){
            response.results.push(localRules[l]);
          }
         }
         
  

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
                }
              
              
            }//for

      }
      callback(validated);
       
      }//validateRule

  }