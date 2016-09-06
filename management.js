define( function(require, exports, module){
  "use strict";
  main.consumes = ["ui", "commands", "Dialog", "dialog.error", "Panel", "dialog.confirm", "dialog.error"];
  main.provides = ["controller.management"];
  return main;

  function main(options, imports, register){
    var ui = imports.ui;
    var commands = imports.commands;
    var Dialog = imports.Dialog;
    var showError = imports["dialog.error"].show;
    var confirm = imports["dialog.confirm"].show;
    var Panel = imports.Panel;

    var markup = require("text!./management.xml");
    var css = require("text!./management.css");

    /***** Initialization *****/
    var plugin = new Panel("Controller List", main.consumes, {
      index: options.index || 200,
      width: 200,
      caption: "Controller",
      buttonCSSClass: "controllers",
      panelCSSClass: "controllercontainer",
      minwidth: 130,
      where: options.where || "left"
    });

    var emit = plugin.getEmitter();
    var controllers = {};
    var sources = [];
    var container, btnActivate, btnInactivate, btnDelete, btnEdit, btnManagement, btnAdd;

    var loaded = false;
    function load(){
      if (loaded) return false;
      loaded = true;

      plugin.setCommand({
        name: "togglecontrollers",
        hint: "show the controller panel"
      });

      //commands
      commands.addCommand({
        name: "activate",
        exec: function(){

        }
      }, plugin);

      commands.addCommand({
        name: "inactivate",
        exec: function(){

        }
      }, plugin);

      commands.addCommand({
        name: "delete",
        exec: function(){

        }
      }, plugin);

      commands.addCommand({
        name: "edit",
        exec: function(){

        }
      }, plugin);

      commands.addCommand({
        name: "manage",
        exec: function(){

        }
      }, plugin);

      commands.addCommand({
        name: "add",
        exec: function(){

        }
      }, plugin);

      // Load CSS
      ui.insertCss(css, false, plugin);

      return loaded;
    }

    function draw(opts){
      //Import Skin
      ui.insertSkin({
        name: "controllers",
        data: require("text!./skin.xml"),
        "media-path" : options.staticPrefix + "/images/",
        "icon-path"  : options.staticPrefix + "/icons/"
      }, plugin);

      // Create UI elements
      var bar = opts.aml;

      var scroller = bar.$ext.appendChild(document.createElement("div"));
      // opts.html.innerHTML = "HELLO";
      scroller.className = "scroller";

      // Create UI elements
      var parent = bar;
      ui.insertMarkup(parent, markup, plugin);

      container = plugin.getElement("hbox");
      btnActivate = plugin.getElement("btnActivate");
      btnInactivate = plugin.getElement("btnInactivate");
      btnDelete = plugin.getElement("btnDelete");
      btnEdit = plugin.getElement("btnEdit");
      btnManagement = plugin.getElement("btnManagement");
      btnAdd = plugin.getElement("btnAdd");

      btnActivate.on("click", function(){

      });
      btnInactivate.on("click", function(){

      });
      btnDelete.on("click", function(){

      });
      btnEdit.on("click", function(){

      });
      btnManagement.on("click", function(){

      });
      btnAdd.on("click", function(){

      });

      var frame = ui.frame({
        htmlNode: scroller,
        buttons: "min",
        activetitle: "min",
        caption: "Controller List"
      });
      ui.insertByIndex(scroller, frame.$ext, 200, false);
      plugin.addElement(frame);
    }

    /***** Methods *****/


    /***** Lifecycle *****/

    plugin.on("draw", function(e) {
      draw(e);
    });
    plugin.on("load", function(){
      load();
    });
    // controllerpanel.on("draw", function(e) {
    //         draw(e);
    // });
    plugin.on("unload", function(){
      loaded = false;
    });



    /***** Register and define API *****/

    register(null, {
      "controller.management": plugin
    });
  }
});
