#!/usr/bin/node

'use strict';

var fs = require('fs');
var csv = require('csv-reader');

var inputStream = fs.createReadStream('./data/sample-grades.csv', 'utf8');

var assessments = {};
var header = [];
var grades = [];

const idFlds = [
	'OrgDefinedId',
	'Username',
	'Last Name',
	'First Name',
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


function parseGradeBreakDown(fld){
	let elems = fld.split(' ');
	let assign = elems.reduce((a,d)=>{
			d = d.split(':');
			d[0] = d[0].toLowerCase();
			if(typeof d[1] !== "undefined"){
				a[d[0]] = d[1];
			}
			return a;
		},{'type':'assig'})
	return assign;
}

function parseField(fld){
	fld = fld
		.replace(/>/ig,'')
		.replace(/  /g,'')
		;
	
	let rtn = {};
	let assig = null;
	let elems = fld.split('<');
	if(elems.length > 1){
		assig = parseGradeBreakDown(elems[1]);
		rtn.grade = {grade:{},weight:{}};
		rtn.grade.grade.of = +assig.maxpoints;
		rtn.grade.weight.of = (
				(assig.weight/100.0)
				*
				(assig.categoryweight/100.0)
			).toFixed(3)
			;
	}
	
	elems = elems[0].split(' ');
	while(elems.pop() === "");
	rtn.scheme = elems.pop();
	rtn.cat = elems.pop();
	rtn.item = elems.join(' ');
	if(assig === null){
		rtn.fname = fld;
	}
	else{
		rtn.fname = ["assig",rtn.cat,rtn.assig,rtn.scheme].join('/');
	}
	
	return rtn;
}

function parserAssements(row){
	const summFlds = [
		'Subtotal',
		'Final',
		'Indicator'
	];
	
	row = row.map((fld)=>{
		let head = {'fname':fld};
		if(-1 <= idFlds.indexOf(fld)){
			head = parseField(fld);
		}
		if(-1 > summFlds.indexOf(head.cat)){
			head = fld;
		}
		return head;
	});
	
	header = row;
	//header.forEach((d)=>{console.debug(d.fname);});
}

function parserGrades(row){
	//console.debug("Parser Grades");
	row = row.reduce((a,d,i)=>{
			if(idFlds.indexOf(header[i].fname) >= 0){
				a[header[i].fname] = d;
			}
			else if(header[i].fname.startsWith('assig')){
				let grade = JSON.clone(header[i]);
				if(header[i].scheme === "Points"){
					grade.grade.grade.grade = +d;
				}
				a.grades.push(grade);
			}
			return a;
		},{grades:[]});
	let student = {};
	Object.keys(row).forEach((k)=>{
		if(k.toLowerCase() !== "grades"){
			//console.debug("===" + k);
			let key = k
				.replace(/ /g,'')
				//.toLowerCase()
				;
			student[key] = row[k]
				.replace(/#/g,'')
				;
		}
	});
	row = row.grades
		.map((d)=>{
			d.weight = d.grade.weight;
			d.grade = d.grade.grade;
			d.student = student;
			return d;
		})
		.filter((d)=>{
			return (d.fname.startsWith("assig") && d.scheme === "Points");
		}).forEach((d)=>{
			grades.push(d);
		});
	//console.debug(row);
}

function parserDates(row){
	if(row[0].toLowerCase() !== "dates"){
		parserGrades(row);
		return;
	}
	row.forEach((d,i)=>{
		let val = Date.parse(d);
		if(!isNaN(val)){
			val = new Date(val);
			header[i].date = val.toISOString().substr(0,10);
		}
	});
}


var parsersGrades = [parserAssements,parserDates,parserGrades];

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
		console.log(header.concat(grades));
	})
	;

