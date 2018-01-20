'use strict';

/*eslint-disable no-implicit-coercion, no-param-reassign, no-extra-parens, no-unused-params*/

function processGrades(course,dataurl,db){
	
	let header = [];
	let grades = [];
	
	if("string" !== typeof course){
		throw new Error("'course' must be a textual description");
	}
	
	const idFlds = [
		'OrgDefinedId',
		'Username',
		'Last Name',
		'First Name',
		'Email'
	];
	
	/*
	console.debug = console.debug || function(msg){
		msg = msg || "";
		msg = JSON.stringify(msg,null,4);
		const marker = "DEBUG: ";
		msg = msg.split('\n').join('\n'+marker);
		msg =  marker + msg;
		console.error(msg);
	};
	*/
	
	function parseGradeBreakDown(fld){
		let assignment = {'type':'assig'};
		let elems = fld
			.split(':')
			.map((d)=>{
				let val = {
					'key':null,
					'value':d.split(' ')
				};
				return val;
			});
		for(let i=elems.length-1; i>0; i--){
			elems[i].key = elems[i-1].value.pop();
			elems[i].value = elems[i].value.join(' ');
		}
		assignment.scoring = elems[0].value[0];
		elems.shift();
		elems.forEach((d)=>{
				assignment[d.key.toLowerCase()] = d.value;
			});
		return assignment;
	}
	
	function parseField(fld){
		fld = fld
			.replace(/>/ig,'')
			.replace(/ {2}/g,'')
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
			rtn.grade.weight.of = +rtn.grade.weight.of;
			rtn.cat = assig.category;
		}
		
		elems = elems[0].split(' ');
		while(elems.pop() === ""){}
		rtn.scheme = elems.pop();
		rtn.item = elems.join(' ');
		if(assig === null){
			rtn.fname = fld;
		}
		else{
			rtn.fname = ["assig",rtn.cat,rtn.item,rtn.scheme].join('/');
		}
		
		return rtn;
	}
	
	function parserAssessments(row){
		const summFlds = [
			'Subtotal',
			'Final',
			'Indicator'
		];
		
		row = row.reduce((a,fld)=>{
			let head = {'fname':fld};
			if(-1 <= idFlds.indexOf(fld)){
				head = parseField(fld);
			}
			if(-1 > summFlds.indexOf(head.cat)){
				head = fld;
			}
			head.course = course;
			a[fld] = head;
			return a;
		},{});
		
		header = row;
		//header.forEach((d)=>{console.debug(d.fname);});
	}
	
	function parserGrades(row){
		//console.debug("Parser Grades");
		row = Object.keys(row).reduce((a,d,i)=>{
				i = d;
				d = row[d];
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
				d.course = course;
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
		if(row['OrgDefinedId'].toLowerCase() !== "dates"){
			parserGrades(row);
			return;
		}
		Object.keys(row).forEach((d)=>{
			let val = Date.parse(row[d]);
			if(!isNaN(val)){
				val = new Date(val);
				header[d].date = val.toISOString().substr(0,10);
			}
		});
	}
	
	
	var parsersGrades = [parserDates,parserGrades];
	
	d3.csv( dataurl, function( rows ) {
		parserAssessments(Object.keys(rows[0]));
		rows.forEach((row)=>{
			parsersGrades[0](row);
			if(parsersGrades.length > 1){
				parsersGrades.shift();
			}
		});
		
			
		/**
		* Import my data
		*/
		Object.values(header)
			.filter((rec)=>{
				// If its in the id fields, ignore it
				if(idFlds.indexOf(rec.fname) >= 0) {
					return false;
				}
				// don't include anything except points scheme
				if(rec.scheme !== 'Points'){
					return false;
				}
				return true; 
			}).forEach(function(rec){
				let key = ["assig",rec.course,rec.cat,rec.item,rec.date];
				key = app.formatKey(key);
				db.upsert(key, function(doc){
					if(app.docsDiffer(doc,rec)){
						rec._id = key;
						return rec;
					}
					return false;
				}).then(function(rec){
					//console.log(JSON.stringify(rec));
				}).catch(function(err){
					console.log(JSON.stringify(err));
				});
			});
			
		ProgBar.start(grades.length);
		grades.forEach(function(rec){
			let key = ["grade",rec.course,rec.student.Username,rec.cat,rec.item,rec.date];
			key = app.formatKey(key);
			db.upsert(key, function(doc){
				//if (!rec.date && !doc.date) return false;
				
				rec.grade.grade = rec.grade.grade || 0;
				rec.grade.pct = rec.grade.pct || 0;
				rec.weight.grade = rec.weight.grade || 0;
				if(rec.grade.of){
					rec.grade.pct = rec.grade.grade / rec.grade.of;
					rec.weight.grade = rec.grade.pct * rec.weight.of;
				}
				if(app.docsDiffer(doc,rec)){
					rec._id = key;
					return rec;
				}
				return false;
			}).then(function(rec){
				//console.log(JSON.stringify(rec));
				ProgBar.finish();
			}).catch(function(err){
				console.log(JSON.stringify(err));
			});
		});
	});
	
}
