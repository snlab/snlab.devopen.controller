define( function(require, exports, module){
  "use strict";
  main.consumes = ["ui", "commands", "Dialog", "dialog.error", "Panel", "dialog.confirm", "dialog.error"];
  main.provides = ["controllermanagement"];
  return main;

  function main(options, imports, register){
    var ui = imports.ui;
    var commands = imports.commands;
    var Dialog = imports.Dialog;
    var showError = imports["dialog.error"].show;
    var confirm = imports["dialog.confirm"].show;
    var Panel = imports.Panel;

    var markup = require("text!./controllermanagement.xml");
    var css = require("text!./controllermanagement.css");

    // var staticPrefix = options.staticPrefix;

    /***** Initialization *****/
    var controllerpanel = new Panel("Controller List", main.consumes, {
      index: options.index || 200,
      width: 200,
      caption: "Controller",
      buttonCSSClass: "controllers",
      panelCSSClass: "controllercontainer",
      minwidth: 130,
      where: options.where || "left"
    });

    var emit = controllerpanel.getEmitter();
    var controllers = {};
    var sources = [];
    var container, btnActivate, btnInactivate, btnDelete, btnEdit, btnManagement, btnAdd;

    var loaded = false;
    function load(){
      if (loaded) return false;
      loaded = true;

      controllerpanel.setCommand({
        name: "togglecontrollers",
        hint: "show the controller panel"
      });

      //commands

      commands.addCommand({
        name: "activate",
        exec: function(){

        }
      }, controllerpanel);

      commands.addCommand({
        name: "inactivate",
        exec: function(){

        }
      }, controllerpanel);

      commands.addCommand({
        name: "delete",
        exec: function(){

        }
      }, controllerpanel);

      commands.addCommand({
        name: "edit",
        exec: function(){

        }
      }, controllerpanel);

      commands.addCommand({
        name: "manage",
        exec: function(){

        }
      }, controllerpanel);

      commands.addCommand({
        name: "add",
        exec: function(){

        }
      }, controllerpanel);

      // Load CSS
      ui.insertCss(css, controllerpanel);
    }

    function draw(opts){
      //Import Skin
      ui.insertSkin({
        name: "controllers",
        data: require("text!./skin.xml"),
        "media-path" : options.staticPrefix + "/images/",
        "icon-path"  : options.staticPrefix + "/icons/"
      }, controllerpanel);

      // Create UI elements
      var bar = opts.aml;

      var scroller = bar.$ext.appendChild(document.createElement("div"));
      // opts.html.innerHTML = "HELLO";
      scroller.className = "scroller";

      // Create UI elements
      var parent = bar;
      ui.insertMarkup(parent, markup, controllerpanel);

      container = controllerpanel.getElement("hbox");
      btnActivate = controllerpanel.getElement("btnActivate");
      btnInactivate = controllerpanel.getElement("btnInactivate");
      btnDelete = controllerpanel.getElement("btnDelete");
      btnEdit = controllerpanel.getElement("btnEdit");
      btnManagement = controllerpanel.getElement("btnManagement");
      btnAdd = controllerpanel.getElement("btnAdd");

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
      controllerpanel.addElement(frame);
    }

    /***** Methods *****/

    // function callControllerList(){
    //   controllerlist.show();
    // }
    //
    // function invokeController(){
    //
    // }



    /***** Lifecycle *****/

    controllerpanel.on("draw", function(e) {
      draw(e);
    });
    controllerpanel.on("load", function(){
      load();
    });
    // controllerpanel.on("draw", function(e) {
    //         draw(e);
    // });
    controllerpanel.on("unload", function(){
      loaded = false;
      defaultExtension = null;
    });



    /***** Register and define API *****/

    register(null, {
      controllermanagement: controllerpanel
    });
  }
});
