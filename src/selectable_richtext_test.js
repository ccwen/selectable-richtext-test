var React=require("react");

var E=React.createElement;
var SelectableRichText=require("ksana-selectable-richtext").SelectableRichText;

var sampletext=require("ksana-selectable-richtext/sampledata/text").map(function(t){return {rawtext:t}});
var samplemarkup=require("ksana-selectable-richtext/sampledata/markups");
var sampletypedef=require("ksana-selectable-richtext/sampledata/typedef_web");
var MarkupMenu=require("./markupmenu");

var selectable_richtext_test=React.createClass({
  getInitialState:function(){
    return {};
  }
  ,markLeft:function(){
    this.refs.srt.markLeft();
  }
  ,markRight:function(){
    this.refs.srt.markRight();
  }
  ,onMarkup:function(type){
    var sel=this.refs.srt.getSelection();
    if (sel.paraStart===-1||sel.paraEnd===-1) return; //no selected paragraph
    if (sel.selStart===-1||sel.selEnd===-1)return;//no selection
    if (sel.paraStart!==sel.paraEnd)return;//only single paragraph selection is supported
    
    if (!samplemarkup[sel.paraStart]) samplemarkup[sel.paraStart]={};
    var mid='m'+Math.round(Math.random()*1000000);
    samplemarkup[sel.paraStart][mid]={s:sel.selStart,l:sel.selEnd-sel.selStart+1,type:type}
    this.refs.srt.cancelSelection();
  }
  ,onFetchText:function(row,cb) {
    sampletext[row].text=sampletext[row].rawtext;
    cb(0,sampletext[row].text,row);
  }
  ,onHyperlink:function(para,mid) {
    console.log(mid.map((m)=>{return {mid:m,obj:samplemarkup[para][m]}}))
  }
  ,render:function(){
    return  E("div",{style:{flex:1}},
              E(MarkupMenu,{onMarkup:this.onMarkup,typedef:sampletypedef
                ,markLeft:this.markLeft,markRight:this.markRight}),
              E(SelectableRichText,{ref:"srt",rows:sampletext 
              ,textStyle:styles.textStyle
              ,onHyperlink:this.onHyperlink
              ,selectedStyle:styles.selectedStyle
              ,selectedTextStyle:styles.selectedTextStyle
              ,markups:samplemarkup
              ,typedef:sampletypedef
              ,onFetchText:this.onFetchText})
    );
  }
});

var styles={
  textStyle:{fontSize:28},
  selectedStyle:{},
  selectedTextStyle:{}
};
module.exports=selectable_richtext_test;