---
marp: true
title: OSM Go!, les dessous d’une appli mobile de contribution
---



# <!--fit--> OSM Go!, les dessous d’une appli mobile de contribution

### Atelier OpenStreetMap Grenoble, 9 mars 2020

###### Fabien Del Olmo 


<!-- This is presenter note. You can write down notes through HTML comment. -->


---


# Présentation
L'application est disponible sur le [Play Store](https://play.google.com/store/apps/details?id=fr.dogeo.osmgo&hl=fr_CA) pour les appareils Android et sous forme de PWA ( [osmgo.com](https://osmgo.com) )


Les sources sont disponibles sur [Github](https://github.com/DoFabien/OsmGo) 


L'app à juste pour objectif d'enrichir la base OSM directement sur le terrain, le plus simplement possible en se concentrant uniquement sur les __POI__ 

C'est une application mobile "hybride"

---


# Une application hybride ? 


- En fait c'est juste une application web exécutée dans le "webview"
- Elle peut accéder à certaines API du téléphone à travers Cordova par exemple
- On utilise donc le langage web (html, js/ts, css...)


 Cela s'oppose aux application natives ( java / koltin) ou presque native(~ react native, flutter, etc )

__--__ C'est relativement lent
__++__ C'est simple comme du web 
__++__ C'est du web ! Compatible de partout (PWA)

---


# Pourquoi Osm Go! ?


- En 2014, [je travaille sur les horaires d'ouvertures des différents commerces et industries](https://tel.archives-ouvertes.fr/PACTE/hal-01102105v1) ...
- Je me rends compte que les POI sont très peu présents dans OSM... 
- Je souhaite m'investir à mon échelle dans cette problématique, mais il n'y a pas d'outil mobile permettant de le faire
- ~2014 => DOSM, l'ancêtre d'Osm Go! qui utilise Leaflet et AngularJs


---


# Ça fonctionne, mais ...
 - C'est très lent sur les smartphones de l'époque dès qu'on affiche beaucoup de points...
 - J'ai un mauvais sens de l'orientation... Impossible d'orienter la carte avec moi...
---


# Naissance fin 2015


- [Mapbox Gl Js](https://github.com/mapbox/mapbox-gl-js) résout une grande partie de ces soucis 
- Angular 2+ qui est beaucoup plus efficace..
- Toujours destiné à ma propre utilisation
- Diffusion d'une première version sur le Playstore en juillet 2018


---
# Osm Go! en quelques chiffres
 - Environ 800 installations actives depuis le PlayStore
 - 290 utilisateurs ayant fait au moins une modification
 - 30 000 modifications
 - 2 650 changesets


---


# L'API 0.6 d'Openstreetmap
 - Une simple Api Rest -HTTP-
 - [Une documentation très complète](https://wiki.openstreetmap.org/wiki/API_v0.6)


Pour la démo, on utilisera [le serveur de développement d'Openstreetmap](https://api06.dev.openstreetmap.org/)



---
# Récupérer les données d'une zone


 - Pas besoin d'authentification
 - On récupère toutes les données de la bounding box, en format XML
 - GET /api/0.6/map?bbox=left,bottom,right,top


```sh
https://openstreetmap.org/api/0.6/map?bbox=5.703964,45.1861997,5.707848,45.189216
```


---
# Des données relationnelles...

### [Résultat](./assets/osm.xml)


- Des "relations" qui contiennent des "ways" (ou des "nodes")
- Des "ways" qui contiennent des "nodes"
- Des "nodes" qui contiennent des coordonnées


--- 
# Convertir ces données en Geojson


- [__osmtogeojson__](https://github.com/tyrasd/osmtogeojson")  utilisé et maintenu dans par [overpass turbo](https://overpass-turbo.eu/)
  -  Pensé uniquement pour l'export des données, il ne garde pas les références pour faire le chemin inverse
  -  Ne peut pas être utilisé dans un webworker



- Osm Go! à donc son propre [convertisseur](https://github.com/DoFabien/OsmGo/tree/master/scripts/osmToOsmgo) qui :
  - indique pour chaque way les identifiants des noeuds et relations le composant et inversement
  - est utilisable dans un webworker


--- 
## Afficher les données sur Leaflet


```js
const baseUrlAPI = 'https://master.apis.dev.openstreetmap.org';
const bbox = `5.703964233398438,45.18619972617592,5.707848072052003,45.18921677981549`                      
const url = `${baseUrlAPI}/api/0.6/map?bbox=${bbox}`
const result = await axios.get(url, {
    headers: {
        'Content-Type': 'text/xml',
        'Accept': 'text/xml'
    }
})
// le xml => result.data
xmlparser = new DOMParser();
xmlDoc = xmlparser.parseFromString(result.data, "text/xml");
const geojson = osmtogeojson(xmlDoc, {flatProperties: false});
return geojson


```


## [Demo interactive](./demo.html)


---
# Authentification à Osm
1. HTTP Basic authentication
   - On envoie l'identifiant & password dans le header de chaque requête
   - __\+__ le plus simple a mettre en place
   - __\-__ le mot de passe est envoyé sur le réseau (httpS!)
2. OAuth 1.0
   - On se connecte à OSM vià un token
   - __\+__ le mot de passe ne se balade pas sur les réseaux
   - __\+__ librairie en JavaScript [osm-auth](https://github.com/osmlab/osm-auth)
   - __\-__ pas utilisable dans la webview


--- 
# "Connexion" en basic authentification


```js
_user = document.getElementById('user').value;
_password  = document.getElementById('password').value;


const url = `${baseUrlAPI}/api/0.6/user/details`


const result = await axios.get(url, {
    headers: {
        "Authorization": `Basic ${btoa(_user + ':' + _password)}`,
        'Content-Type': 'text/xml'
    }
})
```


CF : demo


---
# Les changesets
Chaque modification doit être contenue dans un changeset.


Il possède : 
- un id unique
- un utilisateur unique
- une date d'ouverture et de fermeture
- des tags (message, sources, applications, etc )
  
[En voici un exemple](https://www.openstreetmap.org/history#map=19/45.18675/5.70652) 


---
# Création d'un changeset
```js
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


changeset = result.data; // => id du changeset
```


CF: demo


---
# Création d'un "node"


```js
const changesetId = changeset;
const lnglat = [5.7050641, 45.1876448];
const tags = [
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
const url = `${baseUrlAPI}/api/0.6/node/create`
const result = await axios.put(url, content, {
    headers: {
        "Authorization": `Basic ${btoa(_user + ':' + _password)}`,
        'Content-Type': 'text/xml'
    }
})
```


CF: demo


---
# Modifier un 'node'


```js
const changesetId = changeset;
const nodeId = selectedFeature.properties.id
const version = selectedFeature.properties.meta.version
const lat = selectedFeature.geometry.coordinates[1]; 
const lon = selectedFeature.geometry.coordinates[0];
const tags = selectedFeature.properties.tags;


let tagsXml = Object.keys(tags).map( t => `<tag k="${t}" v="${tags[t]}"/>`);


// On ajoute le tag wheelchair = yes
tagsXml = [...tagsXml, `<tag k="wheelchair" v="yes"/>` ]


let content = `<osm>
<node id="${nodeId}" version="${version}" changeset="${changesetId}" lat="${lat}" lon="${lon}">
${tagsXml.join('\n')}
</node>
</osm>`;


const url = `${baseUrlAPI}/api/0.6/node/${nodeId}`
const result = await axios.put(url, content, {
    headers: {
        "Authorization": `Basic ${btoa(_user + ':' + _password)}`,
        'Content-Type': 'text/xml',
    }
})
console.log(result.data) // => nouveau numéro de version   
```
CF : demo

---
# Supprimer un 'node'


```js
const changesetId = changeset;
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
```
CF : demo

---
# Quelques subtilités...
La conversion en geojson casse la "topologie". Un même noeud apparaitra 2 fois dans le geojson (un pour le "node", un pour le "way")
Modifier la position d'un noeud qui appartient à un way aura pour conséquence de modifier la forme du way.

CF : demo

--- 
# Des questions ?
 - Aller plus loin dans l'API ?
 - La structure, le fonctionnement d'Osm Go! ?
 - Les technologies sous-jacentes ? ( Mapbox gl, Angular, Ionic, etc)
 - Le futur de l'app ?
 - Comment contribuer ?