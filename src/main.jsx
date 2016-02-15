var React=require("react");
var E=React.createElement;
var SRT=require("./selectable_richtext_test");
var maincomponent = React.createClass({
  getInitialState:function() {
    return {};
  },
  render: function() {
    return <SRT/>; 
  }
});
module.exports=maincomponent;