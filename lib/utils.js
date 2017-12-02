/*globals d3 DisplayGrades processGrades processAttend StudentReport PouchDB DisplayAttendance*/
'use strict';
JSON.clone = JSON.clone || function(json){
	let clone = JSON.stringify(json);
	clone = JSON.parse(clone);
	return clone;
};

var d1 = document;
