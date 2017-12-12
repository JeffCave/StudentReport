'use strict';

let DisplayStudent_pending = false;
function DisplayStudent(force){
	let override = force || false;
	if(override){
		DisplayStudent_pending = false;
	}
	if(DisplayStudent_pending){
		return;
	}
	DisplayStudent_pending = true;
	
	setTimeout(function(){
	    let params = app.config;
        
		let opts = {
		    reduce:false,
		    include_docs:true,
			startkey:[params.student],
			endkey:[params.student,{}],
			limit:1,
		};
		db.query('metrics/students', opts)
			.then( function(result){
				DisplayStudent_pending = false;
				if(result.rows.length === 0) return;
				
				d1.querySelector("#studentdata summary h1").innerText = [ ""
				        , result.rows[0].value.FirstName
				        , result.rows[0].value.LastName
			        ].join(' ');
				
				//create the table (if necessary)
				let data = result.rows[0].value;
				data = Object.keys(data).map(function(d){
				    let rtn = {
				        key: d,
				        value: data[d],
                    };
                    return rtn;
				});
				let table = d1.querySelector("#studentdata table");
				if(!table){
				    table = d1.createElement('table');
				    data.forEach(function(d,i){
				        let tr = d1.createElement('tr');
				        tr.dataset.d1Ord = i;
				        tr.dataset.d1Data = null;
				        table.appendChild(tr);
				    });
				    d1.querySelector("#studentdata").appendChild(table);
				}
			    data.forEach(function(d,i){
			        let row = table.rows[i];
			        if(row.dataset.d1Data !== JSON.stringify(d)){
			            row.innerHTML = "<th>"+d.key+"</th><td>"+d.value+"</td>";
			            row.dataset.d1Data = JSON.stringify(d);
		            }
			    });
				
			})
			.catch(function(err){
				console.log(err);
			});
		
	},1000);
}
