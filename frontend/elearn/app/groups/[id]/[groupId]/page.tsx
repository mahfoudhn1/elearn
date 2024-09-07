import React from 'react'

interface Params{
    id:number,
    group_id:number
}
function SnigleGrpoup({params} :{params:Params}) {
    console.log(params);
    
  return (
    <div> group number</div>
  )
}

export default SnigleGrpoup