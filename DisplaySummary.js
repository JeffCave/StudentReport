'use strict';

/* 
global app: this is the main applicaiton 
global db: database
global d1: a shortcut I create for the 'document'
*/

let DisplaySummary_pending = 0;
function DisplaySummary(config){
	config = config || app.confg || {};
	if(config.force){
		DisplaySummary_pending = 0;
	}
	if(DisplaySummary_pending){
		return;
	}
	DisplaySummary_pending = 3;
	
	let params = null;
	
	let vals = {
		grades: null,
		attendance:null,
		students:null,
	};
	
	const thresholds = [
        {
            minrate:0.81,
            status:app.statuses.success,
        },
        {
            minrate:0.72,
            status:app.statuses.warn,
        },
        {
            minrate:0.57,
            status:app.statuses.danger,
        },
        {
            minrate:0,
            status:app.statuses.fail,
        }
        
    ];
    const thresholdsAttendance = [
        {
            minrate:0.85,
            status:app.statuses.success,
        },
        {
            minrate:0.80,
            status:app.statuses.warn,
        },
        {
            minrate:0.5,
            status:app.statuses.danger,
        },
        {
            minrate:0,
            status:app.statuses.fail,
        }
        
    ];
	
	
	function queryData(dataHandler){
		params = JSON.clone(app.config);
		
		let results = {
			grades: null,
			attendance:null,
			student:null
		};
		
		let opts = {
			//reduce:false,
			//include_docs:true,
			group:true,
			group_level:2,
			startkey:[params.group],
			endkey:[params.group,{}],
		};
		
		db.query('metrics/gradesByDate', JSON.clone(opts))
			.then( function(result){
				DisplaySummary_pending--;
				if(result.rows.length === 0) return;
				
				// Call the Data Handler
				results.grades = result.rows;
				dataHandler(results);
				
			})
			.catch(function(err){
				console.log(err);
			});
		
		db.query('metrics/attendance', JSON.clone(opts))
			.then( function(result){
				DisplaySummary_pending--;
				if(result.rows.length === 0) return;
				
				results.attendance = result.rows;
				dataHandler(results);
			});
		
		opts = {
			//reduce:false,
			//include_docs:true,
			group:true,
			group_level:3,
		};
		db.query('metrics/students', JSON.clone(opts))
			.then( function(result){
				DisplaySummary_pending--;
				if(result.rows.length === 0) return;
				
				results.student = result.rows;
				dataHandler(results);
			});
		
	}
	
	/**
	 *
	 */
	function RenderTable(results){
		if(results.grades === null) return;
		if(results.attendance === null) return;
		if(results.student === null) return;
		
		let node = d1.querySelector("#studentsummary table");
		if(!node){
			d1.querySelector("#studentsummary").innerHTML = [
				"<summary><h1>All Students</h1></summary>",
				"<table>",
				" <thead>",
				"  <tr>",
				"   <th><abbr title='Grade'>G</abbr></th>",
				"   <th><abbr title='Attendance'>A</abbr></th>",
				"   <th><abbr title='Behaviour'>B</abbr></th>",
				"   <th>&nbsp;</th>",
				"   <th>&nbsp;</th>",
				"  </tr>",
				" </thead>",
				" <tbody>",
				" </tbody>",
				"</table>"
			].join('');
			node = d1.querySelector("#studentsummary table");
		}
		
		results.agg = results.grades.reduce(function(agg,d){
				agg[d.key[1]] = {
					id:d.key[1],
					grade: d.value,
				};
				return agg;
			},{});
		results.agg = results.attendance.reduce(function(agg,d){
				agg[d.key[1]].attendance = (d.value.sum/d.value.count);
				return agg;
			},results.agg);
		results.agg = results.student
			.filter(function(d){
				return results.agg.hasOwnProperty(d.key[0]);
			})
			.reduce(function(agg,d){
				agg[d.key[0]].student = d.key.slice(1).join(', ');
				return agg;
			},results.agg);
		
		node.tBodies[0].innerHTML = '';
		Object.values(results.agg)
			.map(function(d){
				let grade = d.grade.grade; 
				grade = thresholds
					// get the 
					.filter(function(d){
						return d.minrate <= grade;
					})
					.sort(function(a,b){
						return b.minrate - a.minrate;
					})
					[0].status.name
					;
				let attend = d.attendance;
				attend = thresholdsAttendance
					.filter(function(d){
						return d.minrate <= attend;
					})
					.sort(function(a,b){
						return b.minrate - a.minrate;
					})
					[0].status.name
					;
				return {
						gradeAlert: grade,
						attendAlert: attend,
						id: d.id,
						student: d.student,
						grade: d.grade.grade,
						attend: d.attendance,
					};
			})
			.sort(function(a,b){
				return a.student.localeCompare(b.student);
			})
			.map(function(d){
				let html = [
						/*
						" <td><span class='indicator alert-"+d.gradeAlert+"' > </span>" + (d.grade * 100).toFixed(0) + "%</td>",
						" <td><span class='indicator alert-"+d.attendAlert+"' > </span>" + (d.attend*100).toFixed(0) + "%</td>",
						*/
						" <td><span class='indicator alert-"+d.gradeAlert+"' > </span></td>",
						" <td><span class='indicator alert-"+d.attendAlert+"' > </span></td>",
						" <td><span class='indicator' > </span></td>",
						" <td>" + d.student + "</td>",
						" <td>" + d.id + "</td>",
					].join('');
					
				let tr = d1.createElement('tr');
				let id = d.id;
				tr.innerHTML = html;
				if(app.config.student === d.id){
					tr.classList.add('selected');
				}
				tr.addEventListener('click',function(e){
					if(tr.classList.contains)
					app.config.student=id; 
					let tbody = document.querySelectorAll('#studentsummary tr');
					tr.classList.add('selected');
					app.RedrawData({force:true});
				})
				return tr;
			})
			.forEach(function(d){
				node.tBodies[0].appendChild(d);
			})
			;
		node = d1.querySelector("#studentsummary summary h1");
		node.innerText = params.group;
		
	}
	
	let timeout = 1000;
	if(config.force){
		timeout = 1;
	}
	setTimeout(function(){queryData(RenderTable);},timeout);
	
}
