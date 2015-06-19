      var db = require('ep_etherpad-lite/node/db/DB').db,
          fs = require('fs'),
       async = require('ep_etherpad-lite/node_modules/async'),
   Changeset = require("ep_etherpad-lite/static/js/Changeset"),
    settings = require('ep_etherpad-lite/node/utils/Settings'),
customStyles = require('./customStyles').customStyles;

// Remove cache for this procedure
db['dbSettings'].cache = 0;

var getEndPoints = [
  "customStyles.styles.get",
  "customStyles.styles.stylesForPad",
  "customStyles.styles.allStyles",
  "customStyles.styles.disabledStyles",
  "customStyles.styles.new",
  "customStyles.styles.update",
  "customStyles.styles.globalDisable",
  "customStyles.styles.disable",
  "customStyles.styles.delete",
  "customStyles.styles.setStylesForPad"

];

var setEndPoints = [
  "customStyles.styles.new",
  "customStyles.styles.update",
  "customStyles.styles.globalDisable",
  "customStyles.styles.disable",
  "customStyles.styles.delete"
];

exports.registerRoute = function (hook_name, args, callback) {

  // Need to pass auth!
  var apikey = fs.readFileSync("./APIKEY.txt","utf8");

  getEndPoints.map(function(method){
    args.app.get('/pluginAPI/'+method, function(req, res) {
      var response = customStyles;

      if(req.query.apikey !== apikey){
        console.warn("ep_custom_styles apikey wrong for API");
        res.statusCode = 401;
        res.send({code: 4, message: "no or wrong API Key", data: null});
        return;
      }

      method = method.replace("customStyles.styles.","");
      // object of requested params = req.query

      if(method === "new"){
        customStyles.styles[method](req.query.styleId, req.query.css, req.query.padId, function(err, value){ //this was using req.padId, which wasn't working
          if(err) console.error(err);
          res.send({code: 0, message: "ok", data: value});
        });
      }

      if(method === "update"){
        customStyles.styles[method](req.query.styleId, req.query.css, function(err, value){
          if(err) console.error(err);
          res.send(value);
        });
      }

      if(method === "globalDisable"){
        customStyles.styles[method](req.query.styleId, function(err, value){
          if(err) console.error(err);
          res.send(value);
        });
      }

      if(method === "disable"){
        customStyles.styles[method](req.query.styleId, req.padId, function(err, value){
          if(err) console.error(err);
          res.send(value);
        });
      }

      if(method === "delete"){
        customStyles.styles[method](req.query.styleId, function(err, value){
          if(err) console.error(err);
          res.send(value);
        });
      }

      if(method === "get"){
        customStyles.styles[method](req.query.styleId, function(err, value){
          if(err) console.error(err);
          res.send(value);
        });
      }

      if(method === "stylesForPad"){
        customStyles.styles[method](req.query.padId, function(err, value){
          if(err) console.error(err);
          res.send(value);
        });
      }

      if(method === "setStylesForPad"){
        customStyles.styles[method](req.query.padId, req.query.styleIds, function(err, value){
          if(err) console.error(err);
          res.send({code: 0, message: "ok", data: null});
        });
      }

      if(method === "allStyles"){
        customStyles.styles[method](function(err, value){
          if(err) console.error(err);
          res.send(value);
        });
      }

      if(method === "disabledStyles"){
        customStyles.styles[method](function(err, value){
          if(err) console.error(err);
          res.send(value);
        });
      }

    });
  })
  setEndPoints.map(function(method){
    args.app.post('/api/plugin/'+method, function(req, res) {
    });
  })
}

/*
  HTML Exports Styling
*/

exports.stylesForExport = function(hook, padId, cb){

  // Get Each Style from the Database
  customStyles.styles.stylesForPad(padId, function(err, styleIds){
    if(err) console.error(err);
    var cssString = "";
    if(!styleIds){
      return cb("");
    }
    async.eachSeries(styleIds, function(styleId,callback){
      console.error("styleId", styleId);
      // get it
      customStyles.styles.get(styleId, function(err, css){
        cssString += " " + css;
      });
      callback(null, styleId);
    },function(err){
      if(err){
        console.warn("Error getting CSS for this Pad", padId);
        return("");
      }
      if(cssString) cssString = cssString.replace(/\n/g, "");
      console.error("results", cssString);
      cb(cssString);
    })
  });
}

// Our Custom Style attribute will result in a customStyle:styleId class
exports.aceAttribsToClasses = function(hook, context){
  if(context.key.indexOf("customStyles") > -1){
    return [context.key];
  }
}

exports.aceAttribClasses = function(hook_name, attr, cb){
  // I need to return tag:customStyleName
  attr.sub = 'tag:sub';
  cb(attr);
}

//Add the custom attributes as tags for export
//If an attribute is added here, it gets exported as a tag, regardless of how it is rendered in the client... I think?
//This fires when getHTML is called from the web API, the aceAttrib hooks don't seem to be?
exports.exportHtmlAdditionalTags = function(hook, pad, cb){
  var tags = [];
  //get the pad id from the pad
  var padId = pad.id;
  //fetch the styles
  customStyles.styles.stylesForPad(padId, function(err, styleIds){
    if(err) console.error(err);
    var cssString = "";
    if(!styleIds){
      styleIds = [''];
    }
    //old skool loop to reformat ids as attribute names
    var index;
    for(index = 0; index < styleIds.length; ++index){
      tags[index] = "customStyles-" + styleIds[index];
    }
  });
  cb(tags);
}

//following the example from ep_font_size
//there has got to be a better way to do this
exports.getLineHTMLForExport = function(hook, context) {
  //fetch styles used from the apool because (shrug)
  styles = [];
  for (var key in context.apool.numToAttrib){
    if(context.apool.numToAttrib[key][0].search("customStyles-") != -1){
      if(styles.indexOf(context.apool.numToAttrib[key][0]) == -1){
        styles.push(context.apool.numToAttrib[key][0]);
    }
      }
  }
  var lineContent = context.lineContent;
  console.warn(lineContent);

  styles.forEach(function(style){
    styleId = style.split('_')[1];
    styleColor = style.split('_')[2];
    lineContent = lineContent.replace(style, "span class='markup "+styleColor+"' data-id='"+styleId+"'");
    lineContent = lineContent.replace("/"+style, "/span");
  });
  lineContent = lineContent + '<br>';
  return lineContent;
}
