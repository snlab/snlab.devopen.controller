define(function(require, exports, module) {
    var oop = require("ace/lib/oop");
    var TreeData = require("ace_tree/data_provider");

    var DataProvider = function(root) {
        TreeData.call(this, root);
        this.rowHeight = 18;
    };
    oop.inherits(DataProvider, TreeData);

    (function() {

        this.getChildren = function(node) {
            return node.children;
        };

        this.hasChildren = function(node) {
            return false;
        };

    }).call(DataProvider.prototype);

    return DataProvider;
});
