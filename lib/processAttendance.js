'use strict';
function processAttend(course,dataurl,db){
	if("string" !== typeof course){
		throw new Error("'course' must be a textual description");
	}
	
	
	
	let attendance = [];
	
	const idFlds = [
		'OrgDefinedId',
		'Username',
		'LastName',
		'FirstName',
		'Email'
	];
	
	function parserAttendance(row){
		let student = {};
		Object.keys(row).forEach((d)=>{
			let i = d;
			d = row[d];
			let head = i
				//.toLowerCase()
				.replace(/ /g,'')
				;
			if(idFlds.indexOf(head) >= 0){
				student[head.toLowerCase()] = d;
			}
			else {
				let date = Date.parse(i);
				if(!isNaN(date)){
					//console.debug("=1="+header[i]);
					date = new Date(date);
					//console.debug("=2="+date);
					date = date.toISOString().substr(0,10);
					//console.debug("=3="+date);
					let id = ['attend',course,student.username]
						.concat(date.split('-'))
						.join(app.KeyDelim)
						;
					let attend ={
						_id:id,
						course:course,
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
	
	d3.csv( dataurl, function( rows ) {
		rows.forEach((row)=>{
			parserAttendance(row);
		});
		ProgBar.start(attendance.length);
		attendance.forEach(function(rec){
			db.upsert(rec._id, function(doc){
				if(app.docsDiffer(doc,rec)){
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
