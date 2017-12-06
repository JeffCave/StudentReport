'use strict';
function processAttend(dataurl,db){


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
					let id = ['attend',"logprog",student.username]
					   .concat(date.split('-'))
					   .join(app.KeyDelim)
					   ;
					let attend ={
					    _id:id,
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
		db.bulkDocs(attendance);
	});
		
		
}
