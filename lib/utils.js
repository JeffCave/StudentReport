'use strict';

/*globals d3 DisplayGrades processGrades processAttend StudentReport PouchDB DisplayAttendance*/

JSON.clone = JSON.clone || function(json){
	let clone = JSON.stringify(json);
	clone = JSON.parse(clone);
	return clone;
};

JSON.merge = JSON.merge || function(){
	let clone = Array.from(arguments).reduce(function(a,d){
		Object.entries(d).forEach((elems)=>{
			let key = elems[0];
			let val = elems[1];
			a[key] = val;
		});
		return a;
	},{})
	return clone;
};


var d1 = document;
