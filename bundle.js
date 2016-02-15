(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\breakmarkup.js":[function(require,module,exports){
/* break markup into renderable sections*/
/*

input : paragraph , markups (absolute position, start from this paragraph)
        selectable
        	if selectable, sections are break up into tokens

output: renderable tokens 
          renderable:
          	text
          	offset //offset in paragraph text
			markup //markup covering this token
*/

var buildInvertedMarkup=function(markups){
	var markupstart={},markupend={};
	for (var mid in markups) {
		var m=markups[mid];
		if (!markupstart[m.s]) markupstart[m.s]=[];
		markupstart[m.s].push(mid);
		if (!markupend[m.s+m.l]) markupend[m.s+m.l]=[];
		markupend[m.s+m.l].push(mid);
	}
	return {markupstart:markupstart,markupend:markupend};
}
var _break=function(text,ms,me){
	var M=new Set();
	var tokens=[], tokenOffsets=[], tokenMarkups=[], lasttext="", lastoffset=0;
	for (var i=0;i<text.length;i+=1) {

		if (i && (ms[i] || me[i])) { // markup changed
			tokens.push(lasttext);
			tokenOffsets.push(lastoffset);
			tokenMarkups.push(Array.from(M));
			lasttext="";
			lastoffset=i;
		}
		ms[i]&&	ms[i].map(function(m){M.add(m)});
		me[i]&&	me[i].map(function(m){M.delete(m)});
				
		lasttext+=text[i];
	}
	tokens.push(lasttext);
	tokenOffsets.push(lastoffset);
	tokenMarkups.push(Array.from(M));

	return {tokens:tokens,tokenOffsets:tokenOffsets,tokenMarkups:tokenMarkups};
}
var shredding=function(para,tokenizer){
	var tokens=[],tokenOffsets=[],tokenMarkups=[];
	for (var i=0;i<para.tokens.length;i+=1) {
		var t=para.tokens[i];
		var r=tokenizer(t);
		if (r.tokens[0]===t) {
			tokens.push(para.tokens[i]);
			offsets.push(para.tokenOffsets[i]);
			markups.push(para.tokenMarkups[i]);
		} else {
			for(var j=0;j<r.tokens.length;j+=1) {
				tokens.push(r.tokens[j]);
				tokenOffsets.push(para.tokenOffsets[i]+r.tokenOffsets[j]);
				tokenMarkups.push(para.tokenMarkups[i]);
			}
		}
	}
	return {tokens:tokens,offsets:offsets,markups:markups};
}
var breakmarkup=function(tokenizer,text,markups,shred){
	if (!text) return {tokens:[],tokenMarkups:[],tokenOffsets:[]};
	if (!markups || Object.keys(markups).length==0) {
		return shred?tokenizer(text):{tokens:[text], tokenMarkups:[0],tokenOffsets:[]};
	} else {
		var r=buildInvertedMarkup(markups);
		var out= _break(text,r.markupstart,r.markupend);
		if (!shred)return out;
		return shredding(out,tokenizer);
	}
}
module.exports=breakmarkup;
},{}],"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\deferlistview.js":[function(require,module,exports){
/* Defer loading List View for React Native*/

var React=require("react-native");
var {
  View,Text,Image,ListView,StyleSheet,TouchableHighlight,PropTypes
} =React;
var E=React.createElement;
/*
 cloneWithRows , the array passed must be changed too (assume immutable array) 

 optimal row count <2000

 text will be fetched if needed when a row become visible 
*/
var DeferListView=React.createClass({
	propTypes:{
		rows:PropTypes.array.isRequired, 
		onFetchText:PropTypes.func,
		renderRow:PropTypes.func,
		visibleChanged:PropTypes.func,
		style:PropTypes.object
	}
	,rowY:{}
	,rows:{}
	,getDefaultProps:function(){
		return {
			onFetchText: function(row,cb){
				cb(0,this.props.rows[row].text,row);
			},
			renderRow:function(rowData,row){
				return React.createElement(Text,null,rowData.text?row+rowData.text:row);
			}
		}
	}
	,getInitialState:function(){
		this.rows=this.props.rows.slice();
		var ds=new ListView.DataSource({rowHasChanged:this.rowHasChanged});
		return {dataSource: ds.cloneWithRows(this.getRows({}))};
	}
	,rowHasChanged:(r1,r2)=>r1!==r2
	,getRows:function(loaded){
		var out=[];
		for (var i=0;i<this.rows.length;i++) {
			if (loaded[i]) {
				var r=JSON.parse(JSON.stringify(this.rows[i]));
				r.text=loaded[i];
				out.push(r);
				this.rows[i]=r;
			} else{
				out.push( this.rows[i] );
			}
			
		}
		return out;
	}
	,fetchTexts:function(tofetch){
		var taskqueue=[],loaded={};

		var task=function(row) {
			taskqueue.push(function(err,data,retrow){
				if (!err&& data){
					if (!data.empty) {
						loaded[retrow]=data;
					}
				}
				this.props.onFetchText.call(this,row,taskqueue.shift(0,data));
			}.bind(this));
		}.bind(this);

		tofetch.forEach(task);
		taskqueue.push(function(err,data,retrow){
			loaded[retrow]=data;
			setTimeout(function(){
				this.updateText(loaded);
			}.bind(this),100);
			
		}.bind(this));
		taskqueue.shift()(0,{empty:true});
	}
	,updateText:function(loaded){
		var rows=this.getRows(loaded);
		var ds=this.state.dataSource.cloneWithRows(rows);
		this.setState({dataSource:ds,rows:rows},function(){
			if (this.scrollingTo) {
				setTimeout(function(){
					this.refs.list.scrollTo( this.rowY[this.scrollingTo],0);
					this.scrollingTo=null;
				}.bind(this),800); //wait until layout complete
			}
		}.bind(this));		
	}
	,onChangeVisibleRows:function(visibleRows){
		var loading=0,tofetch=[],visibles=[],rows=this.props.rows;
		for (row in visibleRows.s1) {
			if (!rows[row].text) {
				tofetch.push(row);
				loading++;
			}
			visibles.push(parseInt(row));
		}
		if (!loading) return;
		this.fetchTexts(tofetch);

		clearTimeout(this.visibletimer)
		this.visibletimer=setTimeout(function(){
			this.props.visibleChanged&&this.props.visibleChanged(visibles[0],visibles[visibles.length-1]);
		}.bind(this),1000);
	}
	,onRowLayout:function(rowid,evt){
		this.rowY[rowid]=evt.nativeEvent.layout.y;
	}
	,renderRow:function(rowData,sectionId,rowId,highlightRow){	
		return E(View ,{ref:"para"+rowId,style:{overflow:'hidden'}
		 ,onLayout:this.onRowLayout.bind(this,rowId)}
		 ,this.props.renderRow(rowData,rowId,highlightRow));
	}
	,scrollToRow:function(row){
		var y=this.rowY[row];
		if (y) {
			this.refs.list.scrollTo( y,0);
			this.scrollingTo=row;//when layout completed scroll again
		}
	}
	,render:function(){
		return E(View,{style:{flex:1}},
		E(ListView,{ref:"list",style:[this.props.style,{overflow:'hidden'}],
		 dataSource:this.state.dataSource 
		 ,renderRow:this.renderRow, onChangeVisibleRows:this.onChangeVisibleRows
		 ,pageSize:30,initialListSize:1}));
	}
});

module.exports=DeferListView;
},{"react-native":"react-native"}],"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\deferlistview_web.js":[function(require,module,exports){
var React=require("react");
var E=React.createElement;

var InfiniteScroller=require("./infinitescroller");

var DeferListView=React.createClass({
	getDefaultProps:function(){
		return {rows:[]};
	}
	,renderRow:function(row) {
		return this.props.renderRow(this.props.rows[row],row);
	}
	,render:function(){
		return E(InfiniteScroller,
			{averageElementHeight:20
			,containerHeight:this.props.height||600
			,renderRow:this.renderRow
			,totalNumberOfRows:this.props.rows.length});
	}
});


module.exports=DeferListView;
},{"./infinitescroller":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\infinitescroller.js","react":"react"}],"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\index.js":[function(require,module,exports){
var React,Paragraph,ListView,View;

try{
	React=require("react-native");	
	ListView=require("./deferlistview");
	Paragraph=require("./paragraph");
	View=View;
} catch(e) {
	React=require("react");
	ListView=require("./deferlistview_web");
	Paragraph=require("./paragraph_web");
	View="div";
}
var E=React.createElement;
var rowY={};


var SelectableRichText=React.createClass({
	getInitialState:function(){
		return {paraStart:-1,paraEnd:-1,token:null};
	}
	,getSelection:function(){
		return {paraStart:this.state.paraStart,paraEnd:this.state.paraEnd,selStart:this.selStart,selEnd:this.selEnd};
	}	
	,selStart:-1
	,selEnd:-1
	,componentWillUnmount:function(){
	}
	,onSelectionChanged:function(selStart,selEnd,lastStart,lastEnd) {
		this.selStart=selStart;
		this.selEnd=selEnd;
	}
	,onTouchEnd:function(n,evt) {
		var touches=evt.nativeEvent.touches;
		var cTouches=evt.nativeEvent.changedTouches;
		if (cTouches.length===1 && touches.length===1){ //another finger is pressing
			this.setState({paraEnd:n});
		}
	}
	,onTouchStart:function(n,evt){
		var touches=evt.nativeEvent.touches;
		if (touches.length===1) {
			if (this.state.paraStart===-1) {
				this.setState({paraStart:n,paraEnd:n});
			} else if (!this.isSelected(n)){
				this.setState({paraStart:-1,paraEnd:-1});
			}
		}	
	}
	,isSelected:function(n){
		var start=this.state.paraStart;
		var end=this.state.paraEnd;
		if (end<start &&end>-1) {
			var t=end;
			end=start;
			start=t;
		}
		return (n>=start)&&(n<=end);
	}
	,cancelSelection:function(){
		this.selStart=-1;
		this.selEnd=-1;
		this.setState({paraStart:-1,paraEnd:-1});
	}
	,trimSelection:function(para,start) {
		if (this.state.paraStart===-1)return;
		if (start) {
			this.setState({paraStart:para});
		} else {
			this.setState({paraEnd:para});
		}
	}
	,visibleChanged:function(start,end){
		if (this.state.paraStart>end || start>this.state.paraEnd) {
			this.cancelSelection();
		}
	}
	,getSentenceMarkup:function(sid){
		return this.props.markups[sid];
	}
	,markLeft:function(){
		if (this.state.paraStart===-1) return;
		//this.eventEmitter.emit('adjustSelection',-1);
	}
	,markRight:function(){
		if (this.state.paraEnd===-1) return;
		//this.eventEmitter.emit('adjustSelection',1);
	}
	,fetchText:function(row,cb){
		if (this.props.rows[row].text) return false;
		this.props.onFetchText(row,cb);
	}
	,renderRow:function(rowdata,row){
		var text=rowdata.text,idx=parseInt(row);
			return E(View, {style:this.props.style,key:idx},
				E(Paragraph, 
				{para:idx, text:text 
				,onTouchStart:this.onTouchStart.bind(this,idx)
				,onTouchEnd:this.onTouchEnd.bind(this,idx)
				,onHyperlink:this.props.onHyperlink
				,onSelectionChanged:this.onSelectionChanged
				,token:this.state.token
				,typedef:this.props.typedef
				,markups:this.getSentenceMarkup(idx)
				,selectedStyle:this.props.selectedStyle
				,textStyle:this.props.textStyle
				,selectedTextStyle:this.props.selectedTextStyle
				,selectToken:this.selectToken
				,paraStart:this.state.paraStart
				,paraEnd:this.state.paraEnd
				,trimSelection:this.trimSelection
				,eventEmitter:this.eventEmitter
				,fetchText:this.fetchText
				,cancelSelection:this.cancelSelection}
				)
			);
	}
	,render:function(){
		var props={};
		for (var i in this.props)	props[i]=this.props[i];
		props.ref="listview";
		props.visibleChanged=this.visibleChanged;
		props.renderRow=this.renderRow;

		return E(ListView,props);
	}
});



module.exports={SelectableRichText:SelectableRichText,DeferListView:ListView};
},{"./deferlistview":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\deferlistview.js","./deferlistview_web":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\deferlistview_web.js","./paragraph":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\paragraph.js","./paragraph_web":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\paragraph_web.js","react":"react","react-native":"react-native"}],"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\infinitescroller.js":[function(require,module,exports){
/* from https://github.com/tnrich/react-variable-height-infinite-scroller/blob/master/index.js */

/* remove dependecies */
'use strict';
var React = require('react');
var ReactDOM = require('react-dom');
var validateIoNonnegativeIntegerArray = function(arr){
  for (var i=0;i<arr;i++) if (arr[i]<0) return false;
  return arr;
}

function noop() {}

var InfiniteScoller = React.createClass({
  displayName: 'InfiniteScoller',

  propTypes: {
    averageElementHeight: React.PropTypes.number,
    containerHeight: React.PropTypes.number.isRequired,
    totalNumberOfRows: React.PropTypes.number.isRequired,
    renderRow: React.PropTypes.func.isRequired,
    rowToJumpTo: React.PropTypes.shape({
      row: React.PropTypes.number
    }),
    jumpToBottomOfRow: React.PropTypes.bool,
    containerClassName: React.PropTypes.string,
    onScroll: React.PropTypes.func
  },

  getDefaultProps: function getDefaultProps() {
    return {
      onScroll: noop,
      containerClassName: 'infiniteContainer',
      averageElementHeight: 100
    };
  },

  onEditorScroll: function onEditorScroll(event) {
    // tnr: we should maybe keep this implemented..
    if (this.adjustmentScroll) {
      // adjustment scrolls are called in componentDidUpdate where we manually set the scrollTop (which inadvertantly triggers a scroll)
      this.adjustmentScroll = false;
      return;
    }

    var infiniteContainer = event.currentTarget;
    var visibleRowsContainer = ReactDOM.findDOMNode(this.refs.visibleRowsContainer);

    // const currentAverageElementHeight = (visibleRowsContainer.getBoundingClientRect().height / this.state.visibleRows.length);
    this.oldRowStart = this.rowStart;
    var distanceFromTopOfVisibleRows = infiniteContainer.getBoundingClientRect().top - visibleRowsContainer.getBoundingClientRect().top;
    var distanceFromBottomOfVisibleRows = visibleRowsContainer.getBoundingClientRect().bottom - infiniteContainer.getBoundingClientRect().bottom;
    var newRowStart = undefined;
    var rowsToAdd = undefined;
    if (distanceFromTopOfVisibleRows < 0) {
      if (this.rowStart > 0) {
        rowsToAdd = Math.ceil(-1 * distanceFromTopOfVisibleRows / this.props.averageElementHeight);
        newRowStart = this.rowStart - rowsToAdd;

        if (newRowStart < 0) {
          newRowStart = 0;
        }

        this.prepareVisibleRows(newRowStart, this.state.visibleRows.length);
      }
    } else if (distanceFromBottomOfVisibleRows < 0) {
      // scrolling down, so add a row below
      var rowsToGiveOnBottom = this.props.totalNumberOfRows - 1 - this.rowEnd;
      if (rowsToGiveOnBottom > 0) {
        rowsToAdd = Math.ceil(-1 * distanceFromBottomOfVisibleRows / this.props.averageElementHeight);
        newRowStart = this.rowStart + rowsToAdd;

        if (newRowStart + this.state.visibleRows.length >= this.props.totalNumberOfRows) {
          // the new row start is too high, so we instead just append the max rowsToGiveOnBottom to our current preloadRowStart
          newRowStart = this.rowStart + rowsToGiveOnBottom;
        }
        this.prepareVisibleRows(newRowStart, this.state.visibleRows.length);
      }
    } else {// eslint-disable-line no-empty
      // we haven't scrolled enough, so do nothing
    }
    this.updateTriggeredByScroll = true;
    this.props.onScroll(event);
    // set the averageElementHeight to the currentAverageElementHeight
    // setAverageRowHeight(currentAverageElementHeight);
  },

  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
    var newNumberOfRowsToDisplay = this.state.visibleRows.length;
    if (nextProps.rowToJumpTo && this.props.rowToJumpTo !== nextProps.rowToJumpTo) {
      this.prepareVisibleRows(nextProps.rowToJumpTo.row, newNumberOfRowsToDisplay);
      this.rowJumpTriggered = true;
      this.rowJumpedTo = nextProps.rowToJumpTo.row;
    } else {
      var rowStart = this.rowStart;
      // we need to set the new totalNumber of rows prop here before calling prepare visible rows
      // so that prepare visible rows knows how many rows it has to work with
      this.prepareVisibleRows(rowStart, newNumberOfRowsToDisplay, nextProps.totalNumberOfRows);
    }
  },

  componentWillUpdate: function componentWillUpdate() {
    var visibleRowsContainer = ReactDOM.findDOMNode(this.refs.visibleRowsContainer);
    this.soonToBeRemovedRowElementHeights = 0;
    this.numberOfRowsAddedToTop = 0;
    if (this.updateTriggeredByScroll === true) {
      this.updateTriggeredByScroll = false;
      var rowStartDifference = this.oldRowStart - this.rowStart;
      if (rowStartDifference < 0) {
        // scrolling down
        for (var i = 0; i < -rowStartDifference; i++) {
          var soonToBeRemovedRowElement = visibleRowsContainer.children[i];
          if (soonToBeRemovedRowElement) {
            var height = soonToBeRemovedRowElement.getBoundingClientRect().height;
            // console.log('height', height);
            this.soonToBeRemovedRowElementHeights += this.props.averageElementHeight - height;
            // this.soonToBeRemovedRowElementHeights.push(soonToBeRemovedRowElement.getBoundingClientRect().height);
          }
        }
      } else if (rowStartDifference > 0) {
          // console.log('rowStartDifference', rowStartDifference);
          this.numberOfRowsAddedToTop = rowStartDifference;
        }
    }
  },

  componentDidUpdate: function componentDidUpdate() {
    // strategy: as we scroll, we're losing or gaining rows from the top and replacing them with rows of the "averageRowHeight"
    // thus we need to adjust the scrollTop positioning of the infinite container so that the UI doesn't jump as we
    // make the replacements
    var infiniteContainer = ReactDOM.findDOMNode(this.refs.infiniteContainer);
    var visibleRowsContainer = ReactDOM.findDOMNode(this.refs.visibleRowsContainer);
    if (this.soonToBeRemovedRowElementHeights) {
      infiniteContainer.scrollTop = infiniteContainer.scrollTop + this.soonToBeRemovedRowElementHeights;
    }
    if (this.numberOfRowsAddedToTop) {
      // we're adding rows to the top, so we're going from 100's to random heights, so we'll calculate the differenece
      // and adjust the infiniteContainer.scrollTop by it
      var adjustmentScroll = 0;

      for (var i = 0; i < this.numberOfRowsAddedToTop; i++) {
        var justAddedElement = visibleRowsContainer.children[i];
        if (justAddedElement) {
          adjustmentScroll += this.props.averageElementHeight - justAddedElement.getBoundingClientRect().height;
        }
      }
      infiniteContainer.scrollTop = infiniteContainer.scrollTop - adjustmentScroll;
    }

    if (!visibleRowsContainer.childNodes[0]) {
      if (this.props.totalNumberOfRows) {
        // we've probably made it here because a bunch of rows have been removed all at once
        // and the visible rows isn't mapping to the row data, so we need to shift the visible rows
        var numberOfRowsToDisplay = this.numberOfRowsToDisplay || 4;
        var newRowStart = this.props.totalNumberOfRows - numberOfRowsToDisplay;
        if (!validateIoNonnegativeIntegerArray2([newRowStart])) {
          newRowStart = 0;
        }
        this.prepareVisibleRows(newRowStart, numberOfRowsToDisplay);
        return; // return early because we need to recompute the visible rows
      }
      throw new Error('no visible rows!!');
    }
    var adjustInfiniteContainerByThisAmount = undefined;
    function adjustScrollHeightToRowJump() {
      this.rowJumpTriggered = false;
      var icbr = infiniteContainer.getBoundingClientRect();
      var vrbr = visibleRowsContainer.children[this.state.visibleRows.indexOf(this.rowJumpedTo)].getBoundingClientRect();
      // if a rowJump has been triggered, we need to adjust the row to sit at the top of the infinite container
      if (this.props.jumpToBottomOfRow) {
        adjustInfiniteContainerByThisAmount = icbr.bottom - vrbr.bottom;
      } else {
        adjustInfiniteContainerByThisAmount = icbr.top - vrbr.top;
      }
      infiniteContainer.scrollTop = infiniteContainer.scrollTop - adjustInfiniteContainerByThisAmount;
    }
    // check if the visible rows fill up the viewport
    // tnrtodo: maybe put logic in here to reshrink the number of rows to display... maybe...
    if (visibleRowsContainer.getBoundingClientRect().height / 2 <= this.props.containerHeight) {
      // visible rows don't yet fill up the viewport, so we need to add rows
      if (this.rowStart + this.state.visibleRows.length < this.props.totalNumberOfRows) {
        // load another row to the bottom
        this.prepareVisibleRows(this.rowStart, this.state.visibleRows.length + 1);
      } else {
        // there aren't more rows that we can load at the bottom
        if (this.rowStart - 1 > 0) {
          // so we load more at the top
          this.prepareVisibleRows(this.rowStart - 1, this.state.visibleRows.length + 1); // don't want to just shift view
        } else {
            // all the rows are already visible
            if (this.rowJumpTriggered) {
              adjustScrollHeightToRowJump.call(this);
            }
          }
      }
    } else if (this.rowJumpTriggered) {
      adjustScrollHeightToRowJump.call(this);
    } else if (visibleRowsContainer.getBoundingClientRect().top > infiniteContainer.getBoundingClientRect().top) {
      // scroll to align the tops of the boxes
      adjustInfiniteContainerByThisAmount = visibleRowsContainer.getBoundingClientRect().top - infiniteContainer.getBoundingClientRect().top;
      // console.log('!@#!@#!@#!@#!@#!@#!@#adjustInfiniteContainerByThisAmountTop: '+adjustInfiniteContainerByThisAmount)
      // this.adjustmentScroll = true;
      infiniteContainer.scrollTop = infiniteContainer.scrollTop + adjustInfiniteContainerByThisAmount;
    } else if (visibleRowsContainer.getBoundingClientRect().bottom < infiniteContainer.getBoundingClientRect().bottom) {
      // scroll to align the bottoms of the boxes
      adjustInfiniteContainerByThisAmount = visibleRowsContainer.getBoundingClientRect().bottom - infiniteContainer.getBoundingClientRect().bottom;
      // console.log('!@#!@#!@#!@#!@#!@#!@#adjustInfiniteContainerByThisAmountBottom: '+adjustInfiniteContainerByThisAmount)
      // this.adjustmentScroll = true;
      infiniteContainer.scrollTop = infiniteContainer.scrollTop + adjustInfiniteContainerByThisAmount;
    }
  },

  componentWillMount: function componentWillMount() {
    var newRowStart = 0;
    if (this.props.rowToJumpTo && this.props.rowToJumpTo.row && this.props.rowToJumpTo.row < this.props.totalNumberOfRows) {
      newRowStart = this.props.rowToJumpTo.row;
      this.rowJumpTriggered = true;
      this.rowJumpedTo = this.props.rowToJumpTo.row;
    }
    this.prepareVisibleRows(newRowStart, 4);
  },

  componentDidMount: function componentDidMount() {
    // call componentDidUpdate so that the scroll position will be adjusted properly
    // (we may load a random row in the middle of the sequence and not have the infinte container scrolled properly
    // initially, so we scroll to show the rowContainer)
    this.componentDidUpdate();
  },

  prepareVisibleRows: function prepareVisibleRows(rowStart, newNumberOfRowsToDisplay, newTotalNumberOfRows) {
    // note, rowEnd is optional
    this.numberOfRowsToDisplay = newNumberOfRowsToDisplay;
    var totalNumberOfRows = validateIoNonnegativeIntegerArray([newTotalNumberOfRows]) ? newTotalNumberOfRows : this.props.totalNumberOfRows;
    if (rowStart + newNumberOfRowsToDisplay > totalNumberOfRows) {
      this.rowEnd = totalNumberOfRows - 1;
    } else {
      this.rowEnd = rowStart + newNumberOfRowsToDisplay - 1;
    }
    // console.log('this.rowEnd: ' + this.rowEnd);
    // var visibleRows = this.state.visibleRowsDataData.slice(rowStart, this.rowEnd + 1);
    // rowData.slice(rowStart, this.rowEnd + 1);
    // setPreloadRowStart(rowStart);
    this.rowStart = rowStart;
    if (!validateIoNonnegativeIntegerArray([this.rowStart, this.rowEnd])) {
      throw new Error('Error: row start or end invalid!');
    }
    var newVisibleRows = [];
    for (var i = this.rowStart; i <= this.rowEnd; i++) {
      newVisibleRows.push(i);
    }
    // var newVisibleRows = this.rowStart, this.rowEnd + 1);
    this.setState({
      visibleRows: newVisibleRows
    });
  },

  // public method
  getVisibleRowsContainerDomNode: function getVisibleRowsContainerDomNode() {
    return ReactDOM.findDOMNode(this.refs.visibleRowsContainer);
  },

  render: function render() {
    var _this = this;

    var rowItems = this.state.visibleRows.map(function (i) {
      return _this.props.renderRow(i);
    });

    var rowHeight = this.currentAverageElementHeight ? this.currentAverageElementHeight : this.props.averageElementHeight;
    this.topSpacerHeight = this.rowStart * rowHeight;
    this.bottomSpacerHeight = (this.props.totalNumberOfRows - 1 - this.rowEnd) * rowHeight;

    var infiniteContainerStyle = {
      height: this.props.containerHeight,
      overflowY: 'scroll'
    };

    return React.createElement(
      'div',
      {
        ref: 'infiniteContainer',
        className: this.props.containerClassName,
        style: infiniteContainerStyle,
        onScroll: this.onEditorScroll
      },
      React.createElement('div', { className: 'topSpacer', style: { height: this.topSpacerHeight } }),
      React.createElement(
        'div',
        { ref: 'visibleRowsContainer', className: 'visibleRowsContainer' },
        rowItems
      ),
      React.createElement('div', { ref: 'bottomSpacer', className: 'bottomSpacer', style: { height: this.bottomSpacerHeight } })
    );
  }
});

module.exports = InfiniteScoller;
},{"react":"react","react-dom":"react-dom"}],"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\paragraph.js":[function(require,module,exports){
/*
	Selectable paragraph, links are disabled
*/
var React=require("react-native");
var {
  View,Text,StyleSheet,
  PanResponder,PropTypes
} =React;
var E=React.createElement;
var {tokenizer,isTextToken}=require("./tokenizer");
var {getTokens,getTokenStyle,getTokenHandler}=require("./tokens");
/*
  TODO , 
  remove eventEmitter approach

  selection passed in by props, allow multiple selection.

  send token click event to parent component, 
  let parent component controls the selection (allow multiple selections)
*/
var breakmarkup=require("./breakmarkup");
var Paragraph=React.createClass({
	propTypes:{
		paraStart:PropTypes.number.isRequired,//starting paragraph id
		paraEnd:PropTypes.number.isRequired, //ending paragraph id
		para:PropTypes.number.isRequired,  //paragraph id
		trimSelection:PropTypes.func.isRequired,
		cancelSelection:PropTypes.func.isRequired,
		onMarkupClick:PropTypes.func,
		eventEmitter:PropTypes.object.isRequired,
		onSelectionChanged:PropTypes.func
	}
	,componentDidMount:function(){
		this.props.eventEmitter&&this.props.eventEmitter.addListener('adjustSelection', this.adjustSelection);
	}
	,adjustSelection:function(n){
		if (this.state.selStart===-1||this.state.selEnd===-1||n===0)return;
		//-1 move selStart to left for single token selection
		if (this.state.selStart===this.state.selEnd && this.state.selStart && n<0) {
			this.setState({selStart:this.state.selStart-1,selEnd:this.state.selEnd-1});
		} else if (this.state.selEnd+n<this.state.tokens.length && 
			this.state.selEnd+n>=this.state.selStart) { // resize selEnd
			this.setState({selEnd:this.state.selEnd+n});
		}
	}
	,getInitialState:function() {
		var res=getTokens.call(this);
		res.text=this.props.text;
		res.typedef=this.props.typedef;
		res.selStart=-1;
		res.selEnd=-1;
		return res;	}
	,selectToken:function(idx){
		this.props.selectToken(idx);
	}
	,shouldComponentUpdate:function(nextProps,nextState){

		var selectedChanged=this.isParagraphSelected(nextProps) !== this.isParagraphSelected(this.props);
		if (selectedChanged && this.isParagraphSelected(nextProps)) {
			nextState.selStart=-1;
			nextState.selEnd=-1;//clear token Selection when select again
		}
		var contentChanged=nextProps.markups!==this.props.markups || nextProps.text!==this.props.text;
		if (selectedChanged||this.isParagraphSelected(nextProps) || contentChanged) {
			var res=breakmarkup(nextProps.tokenizer||tokenizer,nextProps.text,nextProps.markups,this.isParagraphSelected(nextProps))
			//var res=this.breakTextByMarkup(nextProps.text,nextProps.markups,this.isParagraphSelected(nextProps));
			nextState.tokens=res.tokens||[];
			nextState.tokenOffsets=res.tokenOffsets||[];
			nextState.tokenMarkup=res.tokenMarkups||[];
		}
		return contentChanged||selectedChanged||this.isParagraphSelected(nextProps) || nextState.selStart!==this.state.selStart||nextState.selEnd!==this.state.selEnd;
	}
	,selectSentence:function(n){
		var start=n,end=n;
		while (start>-2) {
			if (isTextToken(this.state.tokens[start-1])) start--;
			else break;
		}

		while (end<this.state.tokens.length) {
			if (isTextToken(this.state.tokens[end+1])) end++;
			else break;
		}

		this.setState({selStart:start,selEnd:end});
	}
	,onTokenTouchStart:function(n,evt){
		if (evt.nativeEvent.touches.length==1){
			if (n===this.state.selStart && n==this.state.selEnd) {
				this.selectSentence(n);
				return;
			}
			this.setState({selStart:n,selEnd:n});
			this.props.trimSelection(this.props.para,true);
		} else {
			this.setState({selEnd:n});
			if (this.state.selStart===-1) this.setState({selStart:n});
			this.props.trimSelection(this.props.para);
		}
		
	}
	,componentDidUpdate:function(prevProps,prevState) {
		if (prevState.selStart!==this.state.selStart || prevState.selEnd!==this.state.selEnd) {
			this.props.onSelectionChanged&&this.props.onSelectionChanged(this.state.selStart,this.state.selEnd,prevState.selStart,prevState.selEnd);
		}
	}
	,isParagraphSelected:function(props){
		props=props||this.props;
		var para=this.props.para;
		if (props.paraStart<0||props.paraEnd<0)return false;
		if (para>=props.paraStart && para<=props.paraEnd)return true;
		return false;
	}
	,isTokenSelected:function(n,props){
		props=props||this.props;
		var para=this.props.para;
		if (props.paraStart<0||props.paraEnd<0)return false;//no selected paragraph
		if (para<props.paraStart || para>props.paraEnd)return false;//out of range
		if (para>props.paraStart && para<props.paraEnd)return true;//within range

		var start=this.state.selStart;
		var end=this.state.selEnd;
		if (end<start && end>-1) {
			var t=end;
			end=start;
			start=t;
		}

		if (para===props.paraEnd && para!==props.paraStart) {
			start=0;
		}
		if (para===props.paraStart && para!==props.paraEnd) {
			end=this.state.tokens.length;
		}

		return (n>=start)&&(n<=end);
	}
	,onTouchStart:function(){
		if (this.hyperlink_clicked) {
			this.hyperlink_clicked=false;
		} else {
			this.props.onTouchStart.apply(this,arguments);
		}
	}
	,renderToken:function(token,idx){
		var tokenStyle=getTokenStyle.call(this,idx);
		var tokenHandler=getTokenHandler.call(this,idx);

		return E(Text,{onLayout:this.onTokenLayout,onTouchStart:this.isParagraphSelected()?this.onTokenTouchStart.bind(this,idx):tokenHandler
			,style:this.isTokenSelected(idx)?
				[styles.selectedToken,this.props.selectedTextStyle].concat(tokenStyle):tokenStyle 
				,ref:idx,key:idx},token);
	}
	,render:function(){
		if (!this.isParagraphSelected()) {
			return E(View,{onTouchStart:this.onTouchStart},
				E(Text,{style:this.props.textStyle},this.state.tokens.map(this.renderToken)));
		}
		
		return E(View,{style:{flex:1}},
			E(Text,	{style:[styles.selectedParagraph,this.props.textStyle,this.props.selectedStyle]},
				this.state.tokens.map(this.renderToken)));
	}
});
var styles=StyleSheet.create({
	selectedParagraph:{backgroundColor:'rgb(212,232,255'},
	selectedToken:{backgroundColor:'rgb(96,176,255)'}

	//textShadowColor:'yellow',	textShadowRadius:6,textShadowOffset:{width:1,height:1}}
})
module.exports=Paragraph;

},{"./breakmarkup":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\breakmarkup.js","./tokenizer":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\tokenizer.js","./tokens":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\tokens.js","react-native":"react-native"}],"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\paragraph_web.js":[function(require,module,exports){
var React=require("react");
var E=React.createElement;

var isTextToken=require("./tokenizer").isTextToken;
var getTokens=require("./tokens").getTokens;
var getTokenStyle=require("./tokens").getTokenStyle;
var getTokenHandler=require("./tokens").getTokenHandler;


var Paragraph=React.createClass({
	getInitialState:function(){
		var res=getTokens.call(this);
		res.text=this.props.text;
		res.typedef=this.props.typedef;
		res.selStart=-1;
		res.selEnd=-1;
		return res;
	}
	,componentDidMount:function(){
		this.props.fetchText(this.props.para,function(err,text,row){
			var res=getTokens.call(this,this.props,text);
			res.text=text;
			this.setState(res);
		}.bind(this));
	}
	,shouldComponentUpdate:function(nextProps){
		if (nextProps.text===this.props.text || nextProps.text===this.state.text)return false;
		return true;
	}
	,onTouchStart:function(e){
		console.log('touchstart',e)
	}
	,renderToken:function(token,idx){
		var tokenStyle=getTokenStyle.call(this,idx);
		var tokenHandler=getTokenHandler.call(this,idx);
		
		return E("span",{style:tokenStyle,ref:idx,key:idx},token);
	}
	,render:function(){
		return E("span",{key:1,onTouchStart:this.onTouchStart}
			,this.state.tokens.map(this.renderToken));
	}
});

var styles={
	selectedParagraph:{backgroundColor:'rgb(212,232,255'},
	selectedToken:{backgroundColor:'rgb(96,176,255)'}
};

module.exports=Paragraph;
},{"./tokenizer":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\tokenizer.js","./tokens":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\tokens.js","react":"react"}],"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\sampledata\\markups.js":[function(require,module,exports){
module.exports={
	1:{
	 'm1':{s:5,l:2,type:'t1'}
	,'m2':{s:10,l:3,type:'t2'}
	}
	,3:{
	 'm3':{s:2,l:5,type:'t3'}
	,'m4':{s:4,l:7,type:'t4'}  
	}
};
},{}],"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\sampledata\\text.js":[function(require,module,exports){
module.exports=
["金剛般若波羅蜜經",
"如是我聞：一時，佛在舍衛國祇樹給孤獨園，與大比丘眾千二百五十人俱。",
"爾時，世尊食時，著衣持鉢，入舍衛大城乞食。於其城中，次第乞已，還至本處。飯食訖，收衣鉢，洗足已，敷座而坐。",
"時，長老須菩提在大眾中即從座起，偏袒右肩，右膝著地，合掌恭敬而白佛言：",
"「希有！世尊！如來善護念諸菩薩，善付囑諸菩薩。",
"世尊！善男子、善女人，發阿耨多羅三藐三菩提心，應云何住？云何降伏其心？」",
"佛言：「善哉，善哉！須菩提！如汝所說：『如來善護念諸菩薩，善付囑諸菩薩。』",
"汝今諦聽，當為汝說。善男子、善女人，發阿耨多羅三藐三菩提心，應如是住，如是降伏其心。」",
"「唯然。世尊！願樂欲聞。」",
"佛告須菩提：「諸菩薩摩訶薩應如是降伏其心：",
"『所有一切眾生之類，若卵生、若胎生、若濕生、若化生，若有色、若無色，若有想、若無想、若非有想非無想，我皆令入無餘涅槃而滅度之。』如是滅度無量無數無邊眾生，實無眾生得滅度者。	",
"何以故？須菩提！若菩薩有我相、人相、眾生相、壽者相，即非菩薩。",
"復次，須菩提！菩薩於法，應無所住，行於布施，",
"所謂不住色布施，不住聲香味觸法布施。",
"須菩提！菩薩應如是布施，不住於相。",
"何以故？若菩薩不住相布施，其福德不可思量。",
"「須菩提！於意云何？東方虛空可思量不？」「不也，世尊！」「須菩提！南西北方四維上下虛空可思量不？」「不也，世尊！」",
"須菩提！菩薩無住相布施，福德亦復如是不可思量。",
"須菩提！菩薩但應如所教住。",
"「須菩提！於意云何？可以身相見如來不？」",
"「不也，世尊！不可以身相得見如來。",
"何以故？如來所說身相，即非身相。」",
"佛告須菩提：「凡所有相，皆是虛妄。",
"若見諸相非相，則見如來。」",
"須菩提白佛言：「世尊！頗有眾生，得聞如是言說章句，生實信不？」",
"佛告須菩提：「莫作是說。如來滅後，後五百歲，有持戒修福者，於此章句能生信心，以此為實，",
"當知是人，不於一佛二佛三四五佛而種善根，已於無量千萬佛所種諸善根，",
"聞是章句，乃至一念生淨信者，須菩提！如來悉知悉見，是諸眾生得如是無量福德。",
"何以故？是諸眾生無復我相、人相、眾生相、壽者相、無法相，亦無非法相。",
"何以故？是諸眾生若心取相，則為著我、人、眾生、壽者。若取法相，即著我、人、眾生、壽者。何以故？若取非法相，即著我、人、眾生、壽者，",
"是故不應取法，不應取非法。",
"以是義故，如來常說：『汝等比丘，知我說法，如筏喻者，法尚應捨，何況非法。』",
"「須菩提！於意云何？如來得阿耨多羅三藐三菩提耶？如來有所說法耶？」",
"須菩提言：「如我解佛所說義，無有定法名阿耨多羅三藐三菩提，亦無有定法，如來可說。",
"何以故？如來所說法，皆不可取、不可說、非法、非非法。",
"所以者何？一切賢聖，皆以無為法而有差別。」",
"「須菩提！於意云何？若人滿三千大千世界七寶以用布施，是人所得福德，寧為多不？」",
"須菩提言：「甚多，世尊！何以故？是福德即非福德性，是故如來說福德多。」",
"若復有人，於此經中受持，乃至四句偈等，為他人說，其福勝彼。",
"何以故？須菩提！一切諸佛，及諸佛阿耨多羅三藐三菩提法，皆從此經出。",
"須菩提！所謂佛法者，即非佛法。",
"「須菩提！於意云何？須陀洹能作是念：『我得須陀洹果。』不？」須菩提言：「不也，世尊！何以故？須陀洹名為入流，而無所入，不入色、聲、香、味、觸、法，是名須陀洹。」",
"「須菩提！於意云何？斯陀含能作是念：『我得斯陀含果。』不？」須菩提言：「不也，世尊！何以故？斯陀含名一往來，而實無往來，是名斯陀含。」",
"「須菩提！於意云何？阿那含能作是念：『我得阿那含果。』不？」須菩提言：「不也，世尊！何以故？阿那含名為不來，而實無來，是故名阿那含。」",
"「須菩提！於意云何？阿羅漢能作是念：『我得阿羅漢道。』不？」須菩提言：「不也，世尊！何以故？實無有法名阿羅漢。世尊！若阿羅漢作是念：『我得阿羅漢道。』即為著我、人、眾生、壽者。",
"世尊！佛說我得無諍三昧人中最為第一，是第一離欲阿羅漢。",
"我不作是念：『我是離欲阿羅漢。』",
"世尊！我若作是念：『我得阿羅漢道。』世尊則不說須菩提是樂阿蘭那行者。",
"以須菩提實無所行，而名須菩提是樂阿蘭那行。」",
"佛告須菩提：「於意云何？如來昔在然燈佛所，於法有所得不？」「世尊！如來在然燈佛所，於法實無所得。」",
"「須菩提！於意云何？菩薩莊嚴佛土不？」「不也，世尊！何以故？莊嚴佛土者，則非莊嚴，是名莊嚴。」",
"是故須菩提，諸菩薩摩訶薩應如是生清淨心，不應住色生心，不應住聲、香、味、觸、法生心，應無所住而生其心。",
"「須菩提！譬如有人，身如須彌山王，於意云何？是身為大不？」須菩提言：「甚大，世尊！何以故？佛說非身，是名大身。」",
"「須菩提！如恒河中所有沙數，如是沙等恒河，於意云何？是諸恒河沙寧為多不？」須菩提言：「甚多，世尊！但諸恒河尚多無數，何況其沙。」",
"「須菩提！我今實言告汝。若有善男子、善女人，以七寶滿爾所恒河沙數三千大千世界，以用布施，得福多不？」須菩提言：「甚多，世尊！」",
"佛告須菩提：「若善男子、善女人，於此經中，乃至受持四句偈等，為他人說，而此福德勝前福德。」",
"復次，須菩提！隨說是經，乃至四句偈等，當知此處，一切世間天、人、阿修羅，皆應供養，如佛塔廟，",
"何況有人盡能受持讀誦。",
"須菩提！當知是人成就最上第一希有之法，",
"若是經典所在之處，則為有佛，若尊重弟子。",
"爾時，須菩提白佛言：「世尊！當何名此經？我等云何奉持？」",
"佛告須菩提：「是經名為『金剛般若波羅蜜』。",
"以是名字，汝當奉持。",
"所以者何？",
"須菩提！佛說般若波羅蜜，則非般若波羅蜜。",
"須菩提！於意云何？如來有所說法不？」須菩提白佛言：「世尊！如來無所說。」",
"「須菩提！於意云何？三千大千世界所有微塵是為多不？」須菩提言：「甚多，世尊！」",
"須菩提！諸微塵，如來說非微塵，是名微塵。",
"如來說世界，非世界，是名世界。",
"「須菩提！於意云何？可以三十二相見如來不？」「不也，世尊！不可以三十二相得見如來。何以故？如來說三十二相，即是非相，是名三十二相。」",
"「須菩提！若有善男子、善女人，以恒河沙等身命布施；",
"若復有人，於此經中，乃至受持四句偈等，為他人說，其福甚多。」",
"爾時，須菩提聞說是經，深解義趣，涕淚悲泣，而白佛言：",
"「希有，世尊！佛說如是甚深經典，我從昔來所得慧眼，未曾得聞如是之經。",
"世尊！若復有人得聞是經，信心清淨，則生實相，當知是人，成就第一希有功德。",
"世尊！是實相者，則是非相，是故如來說名實相。",
"世尊！我今得聞如是經典，信解受持不足為難，",
"若當來世，後五百歲，其有眾生，得聞是經，信解受持，是人則為第一希有。",
"何以故？此人無我相、人相、眾生相、壽者相。",
"所以者何？我相即是非相，人相、眾生相、壽者相即是非相。",
"何以故？離一切諸相，則名諸佛。」",
"佛告須菩提：「如是，如是！若復有人，得聞是經，不驚、不怖、不畏，當知是人甚為希有。",
"何以故？須菩提！如來說第一波羅蜜，非第一波羅蜜，是名第一波羅蜜。",
"須菩提！忍辱波羅蜜，如來說非忍辱波羅蜜。",
"何以故？須菩提！如我昔為歌利王割截身體，我於爾時，無我相、無人相、無眾生相、無壽者相。何以故？我於往昔節節支解時，若有我相、人相、眾生相、壽者相，應生瞋恨。",
"須菩提！又念過去於五百世作忍辱仙人，於爾所世，無我相、無人相、無眾生相、無壽者相。",
"是故須菩提！菩薩應離一切相，發阿耨多羅三藐三菩提心，",
"不應住色生心，不應住聲香味觸法生心，應生無所住心。",
"若心有住，則為非住。",
"是故佛說：『菩薩心不應住色布施。』",
"須菩提！菩薩為利益一切眾生，應如是布施。",
"如來說：『一切諸相，即是非相。』又說：『一切眾生，則非眾生。』",
"須菩提！如來是真語者、實語者、如語者、不誑語者、不異語者。",
"須菩提！如來所得法，此法無實無虛。",
"須菩提！若菩薩心住於法而行布施，如人入闇，則無所見；",
"若菩薩心不住法而行布施，如人有目，日光明照，見種種色。",
"須菩提！當來之世，若有善男子、善女人，能於此經受持讀誦，則為如來以佛智慧，悉知是人，悉見是人，皆得成就無量無邊功德。",
"須菩提！若有善男子、善女人，初日分以恒河沙等身布施，中日分復以恒河沙等身布施，後日分亦以恒河沙等身布施，如是無量百千萬億劫以身布施；",
"若復有人，聞此經典，信心不逆，其福勝彼，",
"何況書寫、受持、讀誦、為人解說。",
"須菩提！以要言之，是經有不可思議、不可稱量、無邊功德。",
"如來為發大乘者說，為發最上乘者說。",
"若有人能受持讀誦，廣為人說，如來悉知是人，悉見是人，皆得成就不可量、不可稱、無有邊、不可思議功德，如是人等，則為荷擔如來阿耨多羅三藐三菩提。",
"何以故？須菩提！若樂小法者，著我見、人見、眾生見、壽者見，則於此經，不能聽受讀誦、為人解說。",
"須菩提！在在處處，若有此經，一切世間天、人、阿修羅，所應供養；當知此處，則為是塔，皆應恭敬，作禮圍繞，以諸華香而散其處。",
"復次，須菩提！善男子、善女人，受持讀誦此經，若為人輕賤，是人先世罪業，應墮惡道，",
"以今世人輕賤故，先世罪業則為消滅，當得阿耨多羅三藐三菩提。",
"須菩提！我念過去無量阿僧祇劫，於然燈佛前，得值八百四千萬億那由他諸佛，悉皆供養承事，無空過者；",
"若復有人，於後末世，能受持讀誦此經，所得功德，於我所供養諸佛功德，百分不及一，千萬億分、乃至算數譬喻所不能及。",
"須菩提！若善男子、善女人，於後末世，有受持讀誦此經，所得功德，我若具說者，或有人聞，心則狂亂，狐疑不信。",
"須菩提！當知是經義不可思議，果報亦不可思議。",
"爾時，須菩提白佛言：「世尊！善男子、善女人，發阿耨多羅三藐三菩提心，云何應住？云何降伏其心？」",
"佛告須菩提：「善男子、善女人，發阿耨多羅三藐三菩提者，當生如是心：『我應滅度一切眾生。滅度一切眾生已，而無有一眾生實滅度者。』",
"何以故？須菩提！若菩薩有我相、人相、眾生相、壽者相，則非菩薩。",
"所以者何？須菩提！實無有法發阿耨多羅三藐三菩提者。",
"「須菩提！於意云何？如來於然燈佛所，有法得阿耨多羅三藐三菩提不？」",
"「不也，世尊！如我解佛所說義，佛於然燈佛所，無有法得阿耨多羅三藐三菩提。」",
"佛言：「如是，如是！須菩提！實無有法如來得阿耨多羅三藐三菩提。",
"須菩提！若有法如來得阿耨多羅三藐三菩提者，然燈佛則不與我授記：『汝於來世，當得作佛，號釋迦牟尼。』",
"以實無有法得阿耨多羅三藐三菩提，是故然燈佛與我受記，作是言：『汝於來世，當得作佛，號釋迦牟尼。』",
"何以故？如來者，即諸法如義。",
"若有人言：『如來得阿耨多羅三藐三菩提。』須菩提！實無有法，佛得阿耨多羅三藐三菩提。",
"須菩提！如來所得阿耨多羅三藐三菩提，於是中無實無虛。",
"是故如來說：『一切法皆是佛法。』",
"須菩提！所言一切法者，即非一切法，是故名一切法。",
"須菩提！譬如人身長大。須菩提言：「世尊！如來說人身長大，則為非大身，是名大身。」",
"須菩提！菩薩亦如是。若作是言：『我當滅度無量眾生。』則不名菩薩。",
"何以故？須菩提！實無有法名為菩薩。",
"是故佛說：『一切法無我、無人、無眾生、無壽者。』",
"須菩提！若菩薩作是言：『我當莊嚴佛土。』是不名菩薩。",
"何以故？如來說莊嚴佛土者，即非莊嚴，是名莊嚴。",
"須菩提！若菩薩通達無我法者，如來說名真是菩薩。",
"「須菩提！於意云何？如來有肉眼不？」「如是，世尊！如來有肉眼。」「須菩提！於意云何？如來有天眼不？」「如是，世尊！如來有天眼。」「須菩提！於意云何？如來有慧眼不？」「如是，世尊！如來有慧眼。」「須菩提！於意云何？如來有法眼不？」「如是，世尊！如來有法眼。」「須菩提！於意云何？如來有佛眼不？」「如是，世尊！如來有佛眼。」",
"「須菩提！於意云何？恒河中所有沙，佛說是沙不？」「如是，世尊！如來說是沙。」",
"「須菩提！於意云何？如一恒河中所有沙，有如是等恒河，是諸恒河所有沙數佛世界，如是寧為多不？」「甚多，世尊！」",
"佛告須菩提：「爾所國土中，所有眾生，若干種心，如來悉知。",
"何以故？如來說諸心，皆為非心，是名為心。",
"所以者何？須菩提！過去心不可得，現在心不可得，未來心不可得。」",
"「須菩提！於意云何？若有人滿三千大千世界七寶以用布施，是人以是因緣，得福多不？」「如是，世尊！此人以是因緣，得福甚多。」",
"「須菩提！若福德有實，如來不說得福德多；以福德無故，如來說得福德多。」",
"「須菩提！於意云何？佛可以具足色身見不？」「不也，世尊！如來不應以具足色身見。何以故？如來說具足色身，即非具足色身，是名具足色身。」",
"「須菩提！於意云何？如來可以具足諸相見不？」「不也，世尊！如來不應以具足諸相見。何以故？如來說諸相具足，即非具足，是名諸相具足。」",
"「須菩提！汝勿謂如來作是念：『我當有所說法。』莫作是念，",
"何以故？若人言：『如來有所說法。』即為謗佛，不能解我所說故。",
"須菩提！說法者，無法可說，是名說法。」",
"爾時，慧命須菩提白佛言：「世尊！頗有眾生，於未來世，聞說是法，生信心不？」",
"佛言：「須菩提！彼非眾生，非不眾生。",
"何以故？須菩提！眾生、眾生者，如來說非眾生，是名眾生。」",
"須菩提白佛言：「世尊！佛得阿耨多羅三藐三菩提，為無所得耶？」",
"如是，如是！須菩提！我於阿耨多羅三藐三菩提乃至無有少法可得，是名阿耨多羅三藐三菩提。",
"復次，須菩提！是法平等，無有高下，是名阿耨多羅三藐三菩提；",
"以無我、無人、無眾生、無壽者，修一切善法，則得阿耨多羅三藐三菩提。",
"須菩提！所言善法者，如來說非善法，是名善法。",
"須菩提！若三千大千世界中所有諸須彌山王，如是等七寶聚，有人持用布施；",
"若人以此般若波羅蜜經，乃至四句偈等，受持讀誦、為他人說，於前福德百分不及一，百千萬億分，乃至算數譬喻所不能及。",
"須菩提！於意云何？汝等勿謂如來作是念：『我當度眾生。』須菩提！莫作是念。",
"何以故？實無有眾生如來度者，若有眾生如來度者，如來則有我、人、眾生、壽者。",
"須菩提！如來說：『有我者，則非有我，而凡夫之人以為有我。』須菩提！凡夫者，如來說則非凡夫。",
"「須菩提！於意云何？可以三十二相觀如來不？」須菩提言：「如是，如是！以三十二相觀如來。」",
"佛言：「須菩提！若以三十二相觀如來者，轉輪聖王則是如來。」須菩提白佛言：「世尊！如我解佛所說義，不應以三十二相觀如來。」",
"爾時，世尊而說偈言：「若以色見我，以音聲求我，是人行邪道，不能見如來。」",
"須菩提！汝若作是念：『如來不以具足相故，得阿耨多羅三藐三菩提。』須菩提！莫作是念。如來不以具足相故，得阿耨多羅三藐三菩提。",
"須菩提！汝若作是念：『發阿耨多羅三藐三菩提者，說諸法斷滅相。』莫作是念。何以故？發阿耨多羅三藐三菩提心者，於法不說斷滅相。",
"「須菩提！若菩薩以滿恒河沙等世界七寶布施；",
"若復有人知一切法無我，得成於忍，此菩薩勝前菩薩所得功德。",
"須菩提！以諸菩薩不受福德故。」",
"須菩提白佛言：「世尊！云何菩薩不受福德？」",
"須菩提！菩薩所作福德，不應貪著，是故說不受福德。",
"須菩提！若有人言：『如來若來若去、若坐若臥。』是人不解我所說義。",
"何以故？如來者，無所從來，亦無所去，故名如來。",
"「須菩提！若善男子、善女人，以三千大千世界碎為微塵，於意云何？是微塵眾寧為多不？」",
"「甚多，世尊！何以故？若是微塵眾實有者，佛則不說是微塵眾。",
"所以者何？佛說微塵眾，則非微塵眾，是名微塵眾。",
"世尊！如來所說三千大千世界，則非世界，是名世界。",
"何以故？若世界實有者，則是一合相。如來說一合相，則非一合相，是名一合相。」",
"須菩提！一合相者，則是不可說，但凡夫之人貪著其事。",
"「須菩提！若人言：『佛說我見、人見、眾生見、壽者見。』須菩提！於意云何？是人解我所說義不？」「世尊！是人不解如來所說義。",
"何以故？世尊說我見、人見、眾生見、壽者見，即非我見、人見、眾生見、壽者見，是名我見、人見、眾生見、壽者見。」",
"須菩提！發阿耨多羅三藐三菩提心者，於一切法，應如是知，如是見，如是信解，不生法相。",
"須菩提！所言法相者，如來說即非法相，是名法相。",
"須菩提！若有人以滿無量阿僧祇世界七寶持用布施，",
"若有善男子、善女人，發菩薩心者，持於此經，乃至四句偈等，受持讀誦，為人演說，其福勝彼。",
"云何為人演說？不取於相，如如不動。",
"何以故？「一切有為法，如夢、幻、泡、影，如露亦如電，應作如是觀。」",
"佛說是經已，長老須菩提及諸比丘、比丘尼、優婆塞、優婆夷，一切世間天、人、阿修羅，聞佛所說，皆大歡喜，信受奉行。"
]
},{}],"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\sampledata\\typedef_web.js":[function(require,module,exports){
var typedef={
	t1:{style:{borderBottom:'1px solid blue',cursor:"pointer"} }
	,t2:{style:{color:'brown'}}
	,t3:{style:{fontFamily:"DFKai-SB,標楷體"}}
	,t4:{style:{backgroundColor:'yellow'}}
};
module.exports=typedef;
},{}],"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\tokenizer.js":[function(require,module,exports){
/*from ksana-analyzer/tokenizers.js*/
var isSpace=function(c) {
	return (c==" ") ;
}
var isCJK =function(c) {return ((c>=0x3000 && c<=0x9FFF) 
|| (c>=0xD800 && c<0xDC00) || (c>=0xFF00) ) ;}
var simple1=function(s) {
	if (!s) return {tokens:[],offsets:[]};
	var offset=0;
	var tokens=[],offsets=[];
	s=s.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
	var arr=s.split('\n');

	var pushtoken=function(t,off) {
		var i=0;
		if (t.charCodeAt(0)>255) {
			while (i<t.length) {
				var c=t.charCodeAt(i);
				offsets.push(off+i);
				tokens.push(t[i]);
				if (c>=0xD800 && c<=0xDFFF) {
					tokens[tokens.length-1]+=t[i]; //extension B,C,D
				}
				i++;
			}
		} else {
			tokens.push(t);
			offsets.push(off);	
		}
	}
	for (var i=0;i<arr.length;i++) {
		var last=0,sp="";
		str=arr[i];
		str.replace(/[_0-9A-Za-z]+/g,function(m,m1){
			while (isSpace(sp=str[last]) && last<str.length) {
				tokens[tokens.length-1]+=sp;
				last++;
			}
			pushtoken(str.substring(last,m1)+m , offset+last);
			offsets.push(offset+last);
			last=m1+m.length;
		});

		if (last<str.length) {
			while (isSpace(sp=str[last]) && last<str.length) {
				tokens[tokens.length-1]+=sp;
				last++;
			}
			pushtoken(str.substring(last), offset+last);
			
		}		
		offsets.push(offset+last);
		offset+=str.length+1;
		if (i===arr.length-1) break;
		tokens.push('\n');
	}

	return {tokens:tokens,offsets:offsets};

};
var isTextToken=function(token) {
	if (!token) return false;
	var t=token.trim();
	var m=t.match(/[a-zA-Z\u3400-\u9fff\ud800-\udfff]*/);
	return (m && m[0]===t);
}
module.exports={tokenizer:simple1, isTextToken};
},{}],"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\tokens.js":[function(require,module,exports){

var tokenizer=require("./tokenizer").tokenizer;
var breakmarkup=require("./breakmarkup");


var tokenHandler=function(n,evt){
	this.hyperlink_clicked=true; //cancel bubbling to onTouchStart
	var M=this.state.tokenMarkups[n];
	this.props.onHyperlink&&this.props.onHyperlink(this.props.para,M);
	//TODO highlight hyperlink
}

var getTokenHandler=function(n) {
	var M=this.state.tokenMarkups[n];
	if (!M || !Object.keys(M).length)return null;
	var markups=this.props.markups;
	var out={},typedef=this.state.typedef;

	if (typedef[ markups[M[0]].type]) {
		return tokenHandler.bind(this,n);
	} 
	return null; //onTouchStart
}
var getTokenStyle=function(n) {
	var M=this.state.tokenMarkups[n];
	if (!M)return null;

	var markups=this.props.markups;
	var out={},typedef=this.state.typedef;
	M.forEach(function(m,idx){
		if (!markups[m])return;
		var type=markups[m].type;
		if (typedef[type] &&typedef[type].style ) {
			out=Object.assign(out,typedef[type].style);
		}
	});

	return out;
}

var getTokens=function(props,text){
		props=props||this.props;
		text=text||props.text;
		return breakmarkup(props.tokenizer||tokenizer,text,props.markups);
}


module.exports={getTokenStyle:getTokenStyle,
	tokenHandler:tokenHandler,
	getTokenHandler:getTokenHandler,getTokens:getTokens}
},{"./breakmarkup":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\breakmarkup.js","./tokenizer":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\tokenizer.js"}],"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\downloader.js":[function(require,module,exports){

var userCancel=false;
var files=[];
var totalDownloadByte=0;
var targetPath="";
var tempPath="";
var nfile=0;
var baseurl="";
var result="";
var downloading=false;
var startDownload=function(dbid,_baseurl,_files) { //return download id
	var fs     = require("fs");
	var path   = require("path");

	
	files=_files.split("\uffff");
	if (downloading) return false; //only one session
	userCancel=false;
	totalDownloadByte=0;
	nextFile();
	downloading=true;
	baseurl=_baseurl;
	if (baseurl[baseurl.length-1]!='/')baseurl+='/';
	targetPath=ksanagap.rootPath+dbid+'/';
	tempPath=ksanagap.rootPath+".tmp/";
	result="";
	return true;
}

var nextFile=function() {
	setTimeout(function(){
		if (nfile==files.length) {
			nfile++;
			endDownload();
		} else {
			downloadFile(nfile++);	
		}
	},100);
}

var downloadFile=function(nfile) {
	var url=baseurl+files[nfile];
	var tmpfilename=tempPath+files[nfile];
	var mkdirp = require("./mkdirp");
	var fs     = require("fs");
	var http   = require("http");

	mkdirp.sync(path.dirname(tmpfilename));
	var writeStream = fs.createWriteStream(tmpfilename);
	var datalength=0;
	var request = http.get(url, function(response) {
		response.on('data',function(chunk){
			writeStream.write(chunk);
			totalDownloadByte+=chunk.length;
			if (userCancel) {
				writeStream.end();
				setTimeout(function(){nextFile();},100);
			}
		});
		response.on("end",function() {
			writeStream.end();
			setTimeout(function(){nextFile();},100);
		});
	});
}

var cancelDownload=function() {
	userCancel=true;
	endDownload();
}
var verify=function() {
	return true;
}
var endDownload=function() {
	nfile=files.length+1;//stop
	result="cancelled";
	downloading=false;
	if (userCancel) return;
	var fs     = require("fs");
	var mkdirp = require("./mkdirp");

	for (var i=0;i<files.length;i++) {
		var targetfilename=targetPath+files[i];
		var tmpfilename   =tempPath+files[i];
		mkdirp.sync(path.dirname(targetfilename));
		fs.renameSync(tmpfilename,targetfilename);
	}
	if (verify()) {
		result="success";
	} else {
		result="error";
	}
}

var downloadedByte=function() {
	return totalDownloadByte;
}
var doneDownload=function() {
	if (nfile>files.length) return result;
	else return "";
}
var downloadingFile=function() {
	return nfile-1;
}

var downloader={startDownload:startDownload, downloadedByte:downloadedByte,
	downloadingFile:downloadingFile, cancelDownload:cancelDownload,doneDownload:doneDownload};
module.exports=downloader;
},{"./mkdirp":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\mkdirp.js","fs":false,"http":false,"path":false}],"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\html5fs.js":[function(require,module,exports){
/* emulate filesystem on html5 browser */
var get_head=function(url,field,cb){
	var xhr = new XMLHttpRequest();
	xhr.open("HEAD", url, true);
	xhr.onreadystatechange = function() {
			if (this.readyState == this.DONE) {
				cb(xhr.getResponseHeader(field));
			} else {
				if (this.status!==200&&this.status!==206) {
					cb("");
				}
			}
	};
	xhr.send();
}
var get_date=function(url,cb) {
	get_head(url,"Last-Modified",function(value){
		cb(value);
	});
}
var get_size=function(url, cb) {
	get_head(url,"Content-Length",function(value){
		cb(parseInt(value));
	});
};
var checkUpdate=function(url,fn,cb) {
	if (!url) {
		cb(false);
		return;
	}
	get_date(url,function(d){
		API.fs.root.getFile(fn, {create: false, exclusive: false}, function(fileEntry) {
			fileEntry.getMetadata(function(metadata){
				var localDate=Date.parse(metadata.modificationTime);
				var urlDate=Date.parse(d);
				cb(urlDate>localDate);
			});
		},function(){
			cb(false);
		});
	});
}
var download=function(url,fn,cb,statuscb,context) {
	 var totalsize=0,batches=null,written=0;
	 var fileEntry=0, fileWriter=0;
	 var createBatches=function(size) {
		var bytes=1024*1024, out=[];
		var b=Math.floor(size / bytes);
		var last=size %bytes;
		for (var i=0;i<=b;i++) {
			out.push(i*bytes);
		}
		out.push(b*bytes+last);
		return out;
	 }
	 var finish=function() {
		 rm(fn,function(){
				fileEntry.moveTo(fileEntry.filesystem.root, fn,function(){
					setTimeout( cb.bind(context,false) , 0) ;
				},function(e){
					console.log("failed",e)
				});
		 },this);
	 };
		var tempfn="temp.kdb";
		var batch=function(b) {
		var abort=false;
		var xhr = new XMLHttpRequest();
		var requesturl=url+"?"+Math.random();
		xhr.open('get', requesturl, true);
		xhr.setRequestHeader('Range', 'bytes='+batches[b]+'-'+(batches[b+1]-1));
		xhr.responseType = 'blob';
		xhr.addEventListener('load', function() {
			var blob=this.response;
			fileEntry.createWriter(function(fileWriter) {
				fileWriter.seek(fileWriter.length);
				fileWriter.write(blob);
				written+=blob.size;
				fileWriter.onwriteend = function(e) {
					if (statuscb) {
						abort=statuscb.apply(context,[ fileWriter.length / totalsize,totalsize ]);
						if (abort) setTimeout( cb.bind(context,false) , 0) ;
				 	}
					b++;
					if (!abort) {
						if (b<batches.length-1) setTimeout(batch.bind(context,b),0);
						else                    finish();
				 	}
			 	};
			}, console.error);
		},false);
		xhr.send();
	}

	get_size(url,function(size){
		totalsize=size;
		if (!size) {
			if (cb) cb.apply(context,[false]);
		} else {//ready to download
			rm(tempfn,function(){
				 batches=createBatches(size);
				 if (statuscb) statuscb.apply(context,[ 0, totalsize ]);
				 API.fs.root.getFile(tempfn, {create: 1, exclusive: false}, function(_fileEntry) {
							fileEntry=_fileEntry;
						batch(0);
				 });
			},this);
		}
	});
}

var readFile=function(filename,cb,context) {
	API.fs.root.getFile(filename, {create: false, exclusive: false},function(fileEntry) {
		fileEntry.file(function(file){
			var reader = new FileReader();
			reader.onloadend = function(e) {
				if (cb) cb.call(cb,this.result);
			};
			reader.readAsText(file,"utf8");
		});
	}, console.error);
}

function createDir(rootDirEntry, folders,  cb) {
  // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
  if (folders[0] == '.' || folders[0] == '') {
    folders = folders.slice(1);
  }
  rootDirEntry.getDirectory(folders[0], {create: true}, function(dirEntry) {
    // Recursively add the new subfolder (if we still have another to create).
    if (folders.length) {
      createDir(dirEntry, folders.slice(1),cb);
    } else {
			cb();
		}
  }, cb);
};


var writeFile=function(filename,buf,cb,context){
	var write=function(fileEntry){
		fileEntry.createWriter(function(fileWriter) {
			fileWriter.write(buf);
			fileWriter.onwriteend = function(e) {
				if (cb) cb.apply(cb,[buf.byteLength]);
			};
		}, console.error);
	}

	var getFile=function(filename){
		API.fs.root.getFile(filename, {exclusive:true}, function(fileEntry) {
			write(fileEntry);
		}, function(){
				API.fs.root.getFile(filename, {create:true,exclusive:true}, function(fileEntry) {
					write(fileEntry);
				});

		});
	}
	var slash=filename.lastIndexOf("/");
	if (slash>-1) {
		createDir(API.fs.root, filename.substr(0,slash).split("/"),function(){
			getFile(filename);
		});
	} else {
		getFile(filename);
	}
}

var readdir=function(cb,context) {
	var dirReader = API.fs.root.createReader();
	var out=[],that=this;
	dirReader.readEntries(function(entries) {
		if (entries.length) {
			for (var i = 0, entry; entry = entries[i]; ++i) {
				if (entry.isFile) {
					out.push([entry.name,entry.toURL ? entry.toURL() : entry.toURI()]);
				}
			}
		}
		API.files=out;
		if (cb) cb.apply(context,[out]);
	}, function(){
		if (cb) cb.apply(context,[null]);
	});
}
var getFileURL=function(filename) {
	if (!API.files ) return null;
	var file= API.files.filter(function(f){return f[0]==filename});
	if (file.length) return file[0][1];
}
var rm=function(filename,cb,context) {
	var url=getFileURL(filename);
	if (url) rmURL(url,cb,context);
	else if (cb) cb.apply(context,[false]);
}

var rmURL=function(filename,cb,context) {
	webkitResolveLocalFileSystemURL(filename, function(fileEntry) {
		fileEntry.remove(function() {
			if (cb) cb.apply(context,[true]);
		}, console.error);
	},  function(e){
		if (cb) cb.apply(context,[false]);//no such file
	});
}
function errorHandler(e) {
	console.error('Error: ' +e.name+ " "+e.message);
}
var initfs=function(grantedBytes,cb,context) {
	webkitRequestFileSystem(PERSISTENT, grantedBytes,  function(fs) {
		API.fs=fs;
		API.quota=grantedBytes;
		readdir(function(){
			API.initialized=true;
			cb.apply(context,[grantedBytes,fs]);
		},context);
	}, errorHandler);
}
var init=function(quota,cb,context) {
	if (!navigator.webkitPersistentStorage) return;
	navigator.webkitPersistentStorage.requestQuota(quota,
			function(grantedBytes) {
				initfs(grantedBytes,cb,context);
		}, errorHandler
	);
}
var queryQuota=function(cb,context) {
	var that=this;
	navigator.webkitPersistentStorage.queryUsageAndQuota(
	 function(usage,quota){
			initfs(quota,function(){
				cb.apply(context,[usage,quota]);
			},context);
	});
}
var API={
	init:init
	,readdir:readdir
	,checkUpdate:checkUpdate
	,rm:rm
	,rmURL:rmURL
	,getFileURL:getFileURL
	,writeFile:writeFile
	,readFile:readFile
	,download:download
	,get_head:get_head
	,get_date:get_date
	,get_size:get_size
	,getDownloadSize:get_size
	,queryQuota:queryQuota
}
module.exports=API;

},{}],"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\ksanagap.js":[function(require,module,exports){
var appname="installer";
if (typeof ksana=="undefined") {
	window.ksana={platform:"chrome"};
	if (typeof process!=="undefined" && 
		process.versions && process.versions["node-webkit"]) {
		window.ksana.platform="node-webkit";
	}
}
var switchApp=function(path) {
	var fs=require("fs");
	path="../"+path;
	appname=path;
	document.location.href= path+"/index.html"; 
	process.chdir(path);
}
var downloader={};
var rootPath="";

var deleteApp=function(app) {
	console.error("not allow on PC, do it in File Explorer/ Finder");
}
var username=function() {
	return "";
}
var useremail=function() {
	return ""
}
var runtime_version=function() {
	return "1.4";
}

//copy from liveupdate
var jsonp=function(url,dbid,callback,context) {
  var script=document.getElementById("jsonp2");
  if (script) {
    script.parentNode.removeChild(script);
  }
  window.jsonp_handler=function(data) {
    if (typeof data=="object") {
      data.dbid=dbid;
      callback.apply(context,[data]);    
    }  
  }
  window.jsonp_error_handler=function() {
    console.error("url unreachable",url);
    callback.apply(context,[null]);
  }
  script=document.createElement('script');
  script.setAttribute('id', "jsonp2");
  script.setAttribute('onerror', "jsonp_error_handler()");
  url=url+'?'+(new Date().getTime());
  script.setAttribute('src', url);
  document.getElementsByTagName('head')[0].appendChild(script); 
}


var loadKsanajs=function(){

	if (typeof process!="undefined" && !process.browser) {
		var ksanajs=require("fs").readFileSync("./ksana.js","utf8").trim();
		downloader=require("./downloader");
		ksana.js=JSON.parse(ksanajs.substring(14,ksanajs.length-1));
		rootPath=process.cwd();
		rootPath=require("path").resolve(rootPath,"..").replace(/\\/g,"/")+'/';
		ksana.ready=true;
	} else{
		var url=window.location.origin+window.location.pathname.replace("index.html","")+"ksana.js";
		jsonp(url,appname,function(data){
			ksana.js=data;
			ksana.ready=true;
		});
	}
}

loadKsanajs();

var boot=function(appId,cb) {
	if (typeof appId=="function") {
		cb=appId;
		appId="unknownapp";
	}
	if (!ksana.js && ksana.platform=="node-webkit") {
		loadKsanajs();
	}
	ksana.appId=appId;
	if (ksana.ready) {
		cb();
		return;
	}
	var timer=setInterval(function(){
			if (ksana.ready){
				clearInterval(timer);
				cb();
			}
		},100);
}


var ksanagap={
	platform:"node-webkit",
	startDownload:downloader.startDownload,
	downloadedByte:downloader.downloadedByte,
	downloadingFile:downloader.downloadingFile,
	cancelDownload:downloader.cancelDownload,
	doneDownload:downloader.doneDownload,
	switchApp:switchApp,
	rootPath:rootPath,
	deleteApp: deleteApp,
	username:username, //not support on PC
	useremail:username,
	runtime_version:runtime_version,
	boot:boot
}
module.exports=ksanagap;
},{"./downloader":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\downloader.js","fs":false,"path":false}],"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\livereload.js":[function(require,module,exports){
var started=false;
var timer=null;
var bundledate=null;
var get_date=require("./html5fs").get_date;
var checkIfBundleUpdated=function() {
	get_date("bundle.js",function(date){
		if (bundledate &&bundledate!=date){
			location.reload();
		}
		bundledate=date;
	});
}
var livereload=function() {
	if(window.location.origin.indexOf("//127.0.0.1")===-1) return;

	if (started) return;

	timer1=setInterval(function(){
		checkIfBundleUpdated();
	},2000);
	started=true;
}

module.exports=livereload;
},{"./html5fs":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\html5fs.js"}],"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\mkdirp.js":[function(require,module,exports){
function mkdirP (p, mode, f, made) {
     var path = nodeRequire('path');
     var fs = nodeRequire('fs');
	
    if (typeof mode === 'function' || mode === undefined) {
        f = mode;
        mode = 0x1FF & (~process.umask());
    }
    if (!made) made = null;

    var cb = f || function () {};
    if (typeof mode === 'string') mode = parseInt(mode, 8);
    p = path.resolve(p);

    fs.mkdir(p, mode, function (er) {
        if (!er) {
            made = made || p;
            return cb(null, made);
        }
        switch (er.code) {
            case 'ENOENT':
                mkdirP(path.dirname(p), mode, function (er, made) {
                    if (er) cb(er, made);
                    else mkdirP(p, mode, cb, made);
                });
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                fs.stat(p, function (er2, stat) {
                    // if the stat fails, then that's super weird.
                    // let the original error be the failure reason.
                    if (er2 || !stat.isDirectory()) cb(er, made)
                    else cb(null, made);
                });
                break;
        }
    });
}

mkdirP.sync = function sync (p, mode, made) {
    var path = nodeRequire('path');
    var fs = nodeRequire('fs');
    if (mode === undefined) {
        mode = 0x1FF & (~process.umask());
    }
    if (!made) made = null;

    if (typeof mode === 'string') mode = parseInt(mode, 8);
    p = path.resolve(p);

    try {
        fs.mkdirSync(p, mode);
        made = made || p;
    }
    catch (err0) {
        switch (err0.code) {
            case 'ENOENT' :
                made = sync(path.dirname(p), mode, made);
                sync(p, mode, made);
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                var stat;
                try {
                    stat = fs.statSync(p);
                }
                catch (err1) {
                    throw err0;
                }
                if (!stat.isDirectory()) throw err0;
                break;
        }
    }

    return made;
};

module.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;

},{}],"C:\\ksana2015\\selectable-richtext-test\\index.js":[function(require,module,exports){
var React=require("react");
var ReactDOM=require("react-dom");
require("ksana2015-webruntime/livereload")(); 
var ksanagap=require("ksana2015-webruntime/ksanagap");
ksanagap.boot("selectable-richtext-test",function(){
	var Main=React.createElement(require("./src/main.jsx"));
	ksana.mainComponent=ReactDOM.render(Main,document.getElementById("main"));
});
},{"./src/main.jsx":"C:\\ksana2015\\selectable-richtext-test\\src\\main.jsx","ksana2015-webruntime/ksanagap":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\ksanagap.js","ksana2015-webruntime/livereload":"C:\\ksana2015\\node_modules\\ksana2015-webruntime\\livereload.js","react":"react","react-dom":"react-dom"}],"C:\\ksana2015\\selectable-richtext-test\\src\\main.jsx":[function(require,module,exports){
var React=require("react");
var E=React.createElement;
var SRT=require("./selectable_richtext_test");
var maincomponent = React.createClass({displayName: "maincomponent",
  getInitialState:function() {
    return {};
  },
  render: function() {
    return React.createElement(SRT, null); 
  }
});
module.exports=maincomponent;
},{"./selectable_richtext_test":"C:\\ksana2015\\selectable-richtext-test\\src\\selectable_richtext_test.js","react":"react"}],"C:\\ksana2015\\selectable-richtext-test\\src\\markupmenu.js":[function(require,module,exports){
var React=require("react");
var E=React.createElement;

var MarkupMenu=React.createClass({displayName: "MarkupMenu",
	render:function(){
		return E("span",null,"menu");
	}
})
module.exports=MarkupMenu;
},{"react":"react"}],"C:\\ksana2015\\selectable-richtext-test\\src\\selectable_richtext_test.js":[function(require,module,exports){
var React=require("react");

var E=React.createElement;
var SelectableRichText=require("ksana-selectable-richtext").SelectableRichText;

var sampletext=require("ksana-selectable-richtext/sampledata/text").map(function(t){return {rawtext:t}});
var samplemarkup=require("ksana-selectable-richtext/sampledata/markups");
var sampletypedef=require("ksana-selectable-richtext/sampledata/typedef_web");
var MarkupMenu=require("./markupmenu");

var selectable_richtext_test=React.createClass({displayName: "selectable_richtext_test",
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
},{"./markupmenu":"C:\\ksana2015\\selectable-richtext-test\\src\\markupmenu.js","ksana-selectable-richtext":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\index.js","ksana-selectable-richtext/sampledata/markups":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\sampledata\\markups.js","ksana-selectable-richtext/sampledata/text":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\sampledata\\text.js","ksana-selectable-richtext/sampledata/typedef_web":"C:\\ksana2015\\node_modules\\ksana-selectable-richtext\\sampledata\\typedef_web.js","react":"react"}]},{},["C:\\ksana2015\\selectable-richtext-test\\index.js"])
//# sourceMappingURL=bundle.js.map
