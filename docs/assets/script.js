const baseUrlAPI = 'https://master.apis.dev.openstreetmap.org';
const bbox = `5.703964233398438,45.18619972617592,5.707848072052003,45.18921677981549`

let map = L.map('map').setView([45.187655, 5.705074], 18);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let selectedFeature = undefined;

const selectFeature = ( f) => {
    selectedFeature = f.target.feature
    var elem = document.getElementById('selectedId');
    elem.innerText = selectedFeature.id
    console.log(selectedFeature);
}

var dataLayer = L.geoJSON(null, {
    onEachFeature: function (feature, layer) {
        layer.options.draggable = true;

        layer.bindPopup( `version : ${feature.properties.meta.version} \n
        ${JSON.stringify(feature.properties.tags)}`);
        layer.on({
            click: selectFeature,
            'dragend': (l => {
                const newLatlng = l.target.getLatLng();
                feature.geometry.coordinates = [newLatlng.lng, newLatlng.lat]
                console.log(l.target.getLatLng());
            })

        });
        // layer.on('dragend')
    }
}).addTo(map);




/// left,bottom,right,top

let _user ;
let _password ;
let changeset;


const parserOptions = {
    attributeNamePrefix: "",
    attrNodeName: false,

    ignoreAttributes: false,
    ignoreNameSpace: false,
    allowBooleanAttributes: true,
    parseNodeValue: false,
    parseAttributeValue: false,
    trimValues: false,
    cdataTagName: false, //default is 'false'
    cdataPositionChar: "\\c"
}

const osmUserDetail = async () => {
    _user = document.getElementById('user').value;
    _password  = document.getElementById('password').value;

    const url = `${baseUrlAPI}/api/0.6/user/details`
    let result;
    try {
        result = await axios.get(url, {
            headers: {
                "Authorization": `Basic ${btoa(_user + ':' + _password)}`,
                'Content-Type': 'text/xml'
            }
        })
        console.log(result.data);
        document.getElementById('login').style.display = "none";
        document.getElementById('divChangeset').style.display = "block"; 
        
       

    } catch (error) {
        
    }
 



}

const osmGetData = async () => {
    const url = `${baseUrlAPI}/api/0.6/map?bbox=${bbox}`
    const result = await axios.get(url, {
        headers: {
            'Content-Type': 'text/xml',
            'Accept': 'text/xml'
        }
    })
    return result.data
}

const dataToGeojson = async (strXml) => {
    xmlparser = new DOMParser();
    xmlDoc = xmlparser.parseFromString(strXml, "text/xml");
    const geojson = osmtogeojson(xmlDoc, { flatProperties: false });
    return geojson;

}



const drawGeojsonData = (geojson) => {
    dataLayer.clearLayers()
    dataLayer.addData(geojson.features);
}
const diplayRawOSMData = async () => {
    const osmData = await osmGetData();
    const geojson = await dataToGeojson(osmData);
    drawGeojsonData(geojson)
}

const osmGetChangeset = async (open) => {
    const url = `${baseUrlAPI}/api/0.6/changesets/`
    let params = {
        display_name: _user
    }
    if (open) {
        params = { ...params, ...{ open: true } }
    }

    const result = await axios.get(url, {
        headers: {
            'Content-Type': 'text/xml'
        },
        params: params
    })
    console.log(result.data);
    let jsonObj = parser.parse(result.data, parserOptions)
    console.log(jsonObj)
    if ( !jsonObj.osm.changeset){
        return
    }

    if (Array.isArray(jsonObj.osm.changeset)){
        changeset = jsonObj.osm.changeset[0].id;
    } else {
        changeset = jsonObj.osm.changeset.id;
    }
    document.getElementById('divModif').style.display = "block"; 
   
    
    var elem = document.getElementById('changesetId');
    elem.innerText = changeset
}


const osmCreateChangeset = async () => {
    const url = `${baseUrlAPI}/api/0.6/changeset/create`
    const content_put = `
    <osm>
        <changeset>
            <tag k="created_by" v="test_osm_grenoble"/>
            <tag k="comment" v="Juste pour la demo"/>
        </changeset>
    </osm>`;

    const result = await axios.put(url, content_put, {
        headers: {
            "Authorization": `Basic ${btoa(_user + ':' + _password)}`,
            'Content-Type': 'text/xml'
        }
    })

    changeset = result.data;
    var elem = document.getElementById('changesetId');
    elem.innerText = changeset
    document.getElementById('divModif').style.display = "block"; 
    console.log(result.data);
}

const osmCreateNode = async (lnglat, tags, changesetId) => {
    changesetId = changeset;
    lnglat = [5.7050641, 45.1876448];
    tags = [
        ['name', 'La Turbine.coop'],
        ["addr:city", 'Grenoble'],
        ['addr:housenumber', '3-5'],
        ['addr:postcode', '38000'],
        ['office', 'coworking']
    ]

    let content = `
    <osm>
        <node changeset="${changesetId}" lat="${lnglat[1]}" lon="${lnglat[0]}">
            ${tags.map(t => `<tag k="${t[0]}" v="${t[1]}"/> `).join('\n')}
        </node>
    </osm>
    `
    console.log(content);
    const url = `${baseUrlAPI}/api/0.6/node/create`
    const result = await axios.put(url, content, {
        headers: {
            "Authorization": `Basic ${btoa(_user + ':' + _password)}`,
            'Content-Type': 'text/xml'
        }
    })

    console.log(result.data)
}


const osmGetNodeById = async (nodeId) => {
    // nodeId = '4319563998'
    console.log(selectedFeature);
    const url = `${baseUrlAPI}/api/0.6/node/${nodeId}`

    const result = await axios.get(url, {
        headers: {
            'Content-Type': 'text/xml',
            'Accept': 'text/xml'
        }
    })

    // console.log(result.data);
    return result.data;
}


const osmDeleteNode = async () => {
    changesetId = changeset;
    const nodeId = selectedFeature.properties.id
    const version = selectedFeature.properties.meta.version
    const lat = selectedFeature.geometry.coordinates[1]; 
    const lon = selectedFeature.geometry.coordinates[0]

    let content = `<osm>
    <node id="${nodeId}" version="${version}" changeset="${changesetId}" lat="${lat}" lon="${lon}" />
   </osm>`;

    const url = `${baseUrlAPI}/api/0.6/node/${nodeId}`
    const result = await axios.delete(url, {
        data: content,
        headers: {
            "Authorization": `Basic ${btoa(_user + ':' + _password)}`,
            'Content-Type': 'text/xml',
        }
    })

    console.log(result.data)
}

const osmUpdateNode = async ( addWheelchair = false) => {
    changesetId = changeset;
    const nodeId = selectedFeature.properties.id
    const version = selectedFeature.properties.meta.version
    const lat = selectedFeature.geometry.coordinates[1]; 
    const lon = selectedFeature.geometry.coordinates[0];
    const tags = selectedFeature.properties.tags;

    let tagsXml = Object.keys(tags).map( t => `<tag k="${t}" v="${tags[t]}"/>`);
    if (addWheelchair){
        tagsXml = [...tagsXml, `<tag k="wheelchair" v="yes"/>` ]
    }

    let content = `<osm>
    <node id="${nodeId}" version="${version}" changeset="${changesetId}" lat="${lat}" lon="${lon}">
    ${tagsXml.join('\n')}
    </node>
   </osm>`;
   console.log(content);
   const url = `${baseUrlAPI}/api/0.6/node/${nodeId}`
   const result = await axios.put(url, content, {
       headers: {
           "Authorization": `Basic ${btoa(_user + ':' + _password)}`,
           'Content-Type': 'text/xml',
       }
   })
 
   console.log(result.data)

}


