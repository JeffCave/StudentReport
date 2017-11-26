#!/usr/bin/node

'use strict';

var fs = require('fs');
var csv = require('csv-reader');

var inputStream = fs.createReadStream('./data/sample-attendance.csv', 'utf8');

var attendance = [];
var header = [];

const idFlds = [
	'OrgDefinedId',
	'Username',
	'LastName',
	'FirstName',
	'Email'
];

console.debug = (msg)=>{
	msg = msg || "";
	msg = JSON.stringify(msg,null,4);
	const marker = "DEBUG: ";
	msg = msg.split('\n').join('\n'+marker);
	msg =  marker + msg;
	console.error(msg);
};
JSON.clone = (obj)=>{
	return JSON.parse( JSON.stringify(obj) );
};



function parserHeader(row){
	header = row;
}

function parserAttendance(row){
	let student = {};
	row.forEach((d,i)=>{
		let head = header[i]
			//.toLowerCase()
			.replace(/ /g,'')
			;
		if(idFlds.indexOf(head) >= 0){
			student[head.toLowerCase()] = d;
		}
		else {
			let date = Date.parse(header[i]);
			if(!isNaN(date)){
				//console.debug("=1="+header[i]);
				date = new Date(date);
				//console.debug("=2="+date);
				date = date.toISOString().substr(0,10);
				//console.debug("=3="+date);
				let attend ={
					student:student,
					date:date,
					attendance:['A','P'].indexOf(d),
				};
				//console.debug(attend);
				if(attend.attendance < 0){
					attend.attendance = null;
				}
				attendance.push(attend);
			}
		}
	});
}



var parsersGrades = [parserHeader,parserAttendance];

inputStream
	.pipe(csv({ parseNumbers: true, parseBooleans: true, trim: true }))
	.on('data', (row) => {
		parsersGrades[0](row);
		if(parsersGrades.length > 1){
			parsersGrades.shift();
		}
	})
	.on('end', (data) => {
		console.debug('No more rows!');
		console.log(attendance);
	})
	;

