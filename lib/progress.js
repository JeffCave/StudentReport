	var ProgBar = {
		node: function(){
			let item = d1.querySelector("progress#prog");
			return item;
		}
		,start:function(qty){
			qty = qty || 1;
			if(this.getVal() >= this.getMax()){
				this.node().value = 0;
				this.node().max = 0;
			}
			var $val = parseInt(this.getMax()) + qty;
			this.node().max = $val;
			this.update();
		}
		,finish:function(qty){
			qty = qty || 1;
			if(this.getVal() >= this.getMax()){
				this.node().value = 1;
				this.node().max = 1;
			}
			let $val = parseInt(this.getVal()) + qty;
			this.node().value = $val;
			this.update();
		}
		,getVal: function(){
			return this.node().value;
		}
		,getMax: function(){
			return this.node().max;
		}
		,getPct: function(){
			return Math.floor(1000*this.getRatio())/10.0;
		}
		,getRatio: function(){
			return 1.0*this.getVal()/this.getPct;
		}
		,update:function(){
			this.node().innerHTML = '{i} of {I} ({%}%)'
					.replace(/{i}/g,this.getVal())
					.replace(/{I}/g,this.getMax())
					.replace(/{%}/g,this.getPct())
				;
		}
		,init:function(){
			var $progbar = this;
			$(document)
				.bind("ajaxSend", function(){
					$progbar.start();
				})
				.bind("ajaxComplete", function(){
					$progbar.finish();
				})
				.bind("ajaxError", function(){
					$progbar.finish();
				})
				;
		}
	};
