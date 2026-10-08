// A classic script can show this message even when ES modules are blocked by file://.
if (location.protocol === "file:") {
  document.querySelector("#main").innerHTML =
    '<div class="page narrow readable"><h1>Start Helder via de lokale server.</h1><p>Dubbelklikken op index.html werkt niet: de app gebruikt JavaScript-modules en lokale opslag.</p><p>Open een terminal in deze map en voer uit:</p><pre>node server.mjs</pre><p>Of, als je Python gebruikt:</p><pre>python start.py</pre><p>Open daarna <strong>http://localhost:4173</strong>.</p><p>De volledige uitleg staat in README.md.</p></div>';
}
