define( function(require, exports, module){
  "use strict";
  main.consumes = ["Plugin", "net", "menus", "ui", "commands", "terminal", "Dialog", "c9", "dialog.error", "proc", "util", "fs", "console", "tabManager"];
  main.provides = ["controllermanagement"];
  return main;

  function main(options, imports, register){
    var Plugin = imports.Plugin;
    var net = imports.net;
    var menus = imports.menus;
    var ui = imports.ui;
    var c9 = imports.c9;
    var commands = imports.commands;
    var Dialog = imports.Dialog;
    var showError = imports["dialog.error"].show;
    var proc = imports.proc;
    var util = imports.util;
    var fs = imports.fs;
    var console = imports.console;
    var tabManager = imports.tabManager;
    // var ssh2 = require("./lib/ssh2.js");
    var join = require("path").join;
    var basename = require("path").basename;
    var dirname = require("path").dirname;

    var staticPrefix = options.staticPrefix;

    /***** Initialization *****/

    var plugin = new Plugin("Ajax.org", main.consumes);
    // var emit = plugin.getEmitter();

    var readonly = c9.readonly;
    var defaultExtension = "";
    var controllerlist;

    var loaded = false;
    function load(callback) {
        if (loaded) return false;
        loaded = true;

        menus.addItemByPath("Tools/Controller Management", new ui.item({
            command: "managedialog"
        }), 100, plugin);

        menus.addItemByPath("Tools/Controller Management/Controller1", new ui.item({

        }), 120, plugin);
        menus.addItemByPath("Tools/Controller Management/Controller2", new ui.item({

        }), 130, plugin);
        menus.addItemByPath("Tools/Controller Management/Controller3", new ui.item({

        }), 140, plugin);

         controllerlist = new Dialog("controllerlist", main.consumes, {
         name: "open-the-controller-list",
         allowClose: true,
         title: "Choose one controller",
         elements: [
           {
             type: "button",
             id: "cancel",
             color: "grey",
             caption: "Cancel",
             hotkey: "ESC",
             onclick: function(){
               controllerlist.hide();
             }
           },
           {
             type: "button",
             id: "ok",
             color: "green",
             caption: "OK",
             default: true,
             onclick: function(){
               invokeController();
               controllerlist.hide();
             }
           }
         ]
       });

       commands.addCommand({
         name: "managedialog",
         hint: "invoke the controller management list",
         exec: function(){ callControllerList();
       }
      }, plugin);


    }

    /***** Methods *****/

    function callControllerList(){
      controllerlist.show();
    }

    function invokeController(){

    }



    /***** Lifecycle *****/

    plugin.on("load", function(){
        load();
    });
    plugin.on("unload", function(){
        loaded = false;
        defaultExtension = null;
    });



    /***** Register and define API *****/

    register(null, {
        controllermanagement: plugin
    });
  }
});
