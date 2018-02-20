/* global moment */
'use strict';

let DisplayAttendance_pending = 0;
function DisplayAttendance(config){

    const thresholds = [
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

    
    function queryData(){
		config = JSON.merge(config, app.config);
		if(!config.group || !config.effective){
			ProgBar.finish(DisplayGradeAttend_pending);
			DisplayGradeAttend_pending = 0;
			return;
		};
		

        let opts = {
            //reduce:false,
            //include_docs:true,
            group:true,
            group_level:2,
            startkey:[config.group,config.student],
            endkey:[config.group,config.student].concat(config.effective.split('-')),
        };
        db.query('metrics/attendance', JSON.clone(opts))
            .then( function(result){
                DisplayAttendance_pending--;
				ProgBar.finish();

                if(!result.rows.length) return;
                let rec = result.rows[0].value;
                let rate = rec.sum / rec.count;
                
                let node = d1.querySelector("#studentattendance summary sub");
                node.innerHTML = (rate * 1000.0).toFixed(0) + "&permil;";
                //node.innerHTML = (rate * 100.0).toFixed(1) + "%";
                
                node = d1.querySelector("#studentattendance summary span.indicator");
                node.className = "indicator alert-" + thresholds
                    .filter(function(d){
                        return d.minrate <= rate;
                    })
                    .sort(function(a,b){
                        return b.minrate - a.minrate;
                    })
                    [0].status.name
                    ;
            });

        opts.group_level = 5;
        opts.endkey = [config.group,config.student,{}];
		db.query('metrics/attendance', JSON.clone(opts))
            .then( function(result){
                DisplayAttendance_pending--;
				ProgBar.finish();
                if(result.rows.length === 0) return;
                // Adds the svg canvas
                
                let min = moment("3000-12-31");
                let max = moment(0);
                let data = result.rows
                    .filter(function(d){
                        return !isNaN(d.value.sum);
                    })
                    .map(function(d){
                        let rtn = {
                            key:JSON.clone(d.key).slice(2,5).join('-'),
                            value: d.value.sum,
                        };
                        rtn.date = moment(rtn.key);
                        if(rtn.date.diff(min) < 0){
                            min = rtn.date;
                        }
                        if(rtn.date.diff(max) > 0){
                            max = rtn.date;
                        }
                        return rtn;
                    })
                    ;
                data.min = min;
				data.max = max;
				
				aggregateData(data);
            })
            .catch(function(err){
                console.log(err);
            });
    }
	
	function aggregateData(results){
		config.callback(results);
	}
	
	function RenderData(results){
		let gridRange = {
			start:results.min.clone().day(0),
			finish:results.max.clone().day(6),
		};
		gridRange.weeks = gridRange.finish.diff(gridRange.start,'weeks');
		
		let table = d1.querySelector("#studentattendance > table");
		if(table && table.student !== config.student){
			table.parentNode.removeChild(table);
			table = null;
		}
		if(!table){
			table = d1.createElement("table");
			table.student = config.student;
			let html = Array(gridRange.weeks+1)
				.fill("<td><span>&#9724;</span></td>")
				.join('')
				;
			html = Array(7).fill(html).join('</tr><tr>');
			table.innerHTML = html;
			d1.querySelector("#studentattendance").appendChild(table);
			for(let r=table.rows.length-1; r>=0; r--){
				let row = table.rows[r];
				for(let c=row.cells.length-1; c>=0; c--){
					let cell = row.cells[c];
					
					let day = (c * table.rows.length) + r;
					day = gridRange.start.clone().add(day,'days');
					cell.setAttribute('title',day.format('YYYY-MM-DD'));
					
					cell.style.backgroundColor = "lightgray";
					cell.style.color = "lightgray";
					
				}
			}

		}
		
		results
			//.filter(function(d){
			//    return 0>d.date.diff(moment(config.effective));
			//})
			.forEach(function(d){
			   let week = d.date.diff(gridRange.start,'weeks');
			   let day = d.date.day();
			   let cell = table.rows[day].cells[week];
			   if(!cell){
				   console.log("PROBLEM");
			   }
			   cell.style.color = d.value ? "darkgreen" : "firebrick" ;
			   if(0<d.date.diff(moment(config.effective))){
				   cell.style.color = "darkgray";
			   }
			   cell.style.backgroundColor = cell.style.color;
			   //cell.setAttribute('title',d.key);
			});
				
	}

	config = JSON.merge(
			{'wait':1, force:false, callback:RenderData}, 
			app.config, 
			config
		);
	if(config.force){
		ProgBar.finish(DisplayAttendance_pending);
		DisplayAttendance_pending = 0;
		config.wait = 1;
	}
	if(DisplayAttendance_pending){
		return;
	}
	DisplayAttendance_pending = 2;
	ProgBar.start(DisplayAttendance_pending);
	
	setTimeout(queryData, config.wait);
	
}