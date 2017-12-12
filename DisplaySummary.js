'use strict';
let DisplaySummary_pending = 0;
function DisplaySummary(config){
    config = config || {};
	if(config.force){
		DisplaySummary_pending = 0;
	}
	if(DisplaySummary_pending){
		return;
	}
	DisplaySummary_pending = 2;
	
	let vals = {
		grades: null,
		attendance:null
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
		let params = app.config;
		let effective = params.effective;
		
		let results = {
			grades: null,
			attendance:null
		};
		

		let opts = {
		    //reduce:false,
		    //include_docs:true,
			group:true,
			group_level:2,
			startkey:['logprog'],
			endkey:['logprog',{}],
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

	}
	
	/**
	 *
	 */
	function RenderTable(results){
		if(results.grades === null) return;
		if(results.attendance === null) return;
		
		let node = d1.querySelector("#studentsummary table");
		if(!node){
			d1.querySelector("#studentsummary").innerHTML = [
				"<summary><h1>All Students</h1></summary>",
				"<table>",
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
		
		node.innerHTML = Object.values(results.agg).map(function(d){
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
				let html = [
						" <td><span class='indicator alert-"+grade+"' > </span>" + (d.grade.grade * 100).toFixed(0) + "%</td>",
						" <td><span class='indicator alert-"+attend+"' > </span>" + (d.attendance*100).toFixed(0) + "%</td>",
						" <td>" + d.id + "</td>",
					].join('');
				html = `<tr>${html}</tr>`;
				return html;
			})
			.join('')
			;
	}
	
	setTimeout(function(){queryData(RenderTable);},1000);
	
}
