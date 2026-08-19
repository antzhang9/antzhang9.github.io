(function(){
  'use strict';

  /* Replace these sample scenarios with real project exports later. The UI
     reads only from this object, so the exhibit code does not need rewriting. */
  window.PROJECT_DEMO_DATA = {
    flights: {
      homes:[
        { code:'EWR', city:'Newark' },
        { code:'JFK', city:'New York' },
        { code:'PHL', city:'Philadelphia' }
      ],
      cities:[
        { code:'KIX', city:'Osaka' },
        { code:'PVG', city:'Shanghai' },
        { code:'HKG', city:'Hong Kong' },
        { code:'TPE', city:'Taipei' }
      ],
      homeEdges:{
        EWR:{
          outbound:{ KIX:512, PVG:684, HKG:548, TPE:631 },
          inbound:{ KIX:742, PVG:566, HKG:503, TPE:614 }
        },
        JFK:{
          outbound:{ KIX:541, PVG:653, HKG:572, TPE:606 },
          inbound:{ KIX:711, PVG:598, HKG:524, TPE:589 }
        },
        PHL:{
          outbound:{ KIX:579, PVG:716, HKG:603, TPE:664 },
          inbound:{ KIX:768, PVG:621, HKG:557, TPE:646 }
        }
      },
      intercity:{
        KIX:{ PVG:162, HKG:188, TPE:134 },
        PVG:{ KIX:176, HKG:119, TPE:111 },
        HKG:{ KIX:169, PVG:124, TPE:96 },
        TPE:{ KIX:142, PVG:105, HKG:96 }
      }
    },
    wordhunt: [
      {
        id:'solver-lab', label:'Solver lab',
        letters:['S','E','A','R','O','L','V','E','R','T','I','N','D','A','T','A'],
        candidates:4288, pruneRatio:.17, recall:.91, runtime:118,
        words:[
          { word:'SOLVER', confidence:.96, path:[0,4,5,6,7,3] },
          { word:'TRAIN', confidence:.93, path:[9,8,13,10,11] },
          { word:'DATA', confidence:.98, path:[12,13,14,15] },
          { word:'LINE', confidence:.90, path:[5,10,11,7] },
          { word:'ROSE', confidence:.88, path:[8,4,0,1] }
        ]
      },
      {
        id:'risk-grid', label:'Risk grid',
        letters:['F','R','A','U','S','K','E','D','R','I','S','K','C','O','R','E'],
        candidates:3912, pruneRatio:.18, recall:.92, runtime:104,
        words:[
          { word:'FRAUD', confidence:.97, path:[0,1,2,3,7] },
          { word:'RISK', confidence:.95, path:[8,9,10,11] },
          { word:'CORE', confidence:.91, path:[12,13,14,15] },
          { word:'SIRE', confidence:.86, path:[4,9,14,15] }
        ]
      },
      {
        id:'flight-grid', label:'Flight grid',
        letters:['F','L','I','G','A','T','H','S','R','O','U','T','E','C','I','E'],
        candidates:4456, pruneRatio:.165, recall:.905, runtime:126,
        words:[
          { word:'FLIGHT', confidence:.95, path:[0,1,2,3,6,5] },
          { word:'ROUTE', confidence:.94, path:[8,9,10,11,15] },
          { word:'FARE', confidence:.89, path:[0,4,8,12] }
        ]
      }
    ]
  };

  var data = window.PROJECT_DEMO_DATA;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var modal = document.getElementById('projectDemoModal');
  var modalTitle = document.getElementById('projectDemoTitle');
  var closeButton = document.getElementById('projectDemoClose');
  var triggers = document.querySelectorAll('.project-demo-trigger');
  var views = document.querySelectorAll('[data-demo-view]');
  var folderTabs = document.querySelectorAll('[data-folder-pane]');
  var umlView = document.getElementById('projectUmlView');
  var umlTitle = document.getElementById('projectUmlTitle');
  var umlImage = document.getElementById('projectUmlImage');
  var umlDownload = document.getElementById('projectUmlDownload');
  var umlViewport = document.getElementById('projectUmlViewport');
  var umlZoomOut = document.getElementById('umlZoomOut');
  var umlZoomIn = document.getElementById('umlZoomIn');
  var umlZoomReset = document.getElementById('umlZoomReset');
  var umlZoomLevel = document.getElementById('umlZoomLevel');
  var lastTrigger = null;
  var activeDemo = null;
  var activeFolderPane = 'demo';
  var umlZoom = 1;
  var umlAssets = {
    flight: {
      title:'Flight Arbitrage Optimizer UML',
      image:'uml/flight-arbitrage-workflow.svg',
      source:'uml/flight-arbitrage-workflow.drawio',
      alt:'UML activity workflow for the Flight Arbitrage Optimizer, from trip inputs through directional fare comparison, conflict resolution, middle-city testing, and the final itinerary.'
    },
    wordhunt: {
      title:'WordHunt Neural Solver UML',
      image:'uml/wordhunt-neural-solver-workflow.svg',
      source:'uml/wordhunt-neural-solver-workflow.drawio',
      alt:'UML activity workflow for the WordHunt Neural Solver, showing offline model training and the runtime board-search and pruning process.'
    }
  };

  function escapeHtml(value){
    return String(value).replace(/[&<>'"]/g,function(character){
      return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character];
    });
  }
  function clamp(min,max,value){ return Math.max(min,Math.min(max,value)); }
  function money(value){ return '$'+Number(value).toLocaleString('en-US'); }
  function duration(hours){
    var whole = Math.floor(hours);
    var minutes = Math.round((hours-whole)*60);
    return whole+'h '+String(minutes).padStart(2,'0')+'m';
  }

  function configureUml(name){
    var asset = umlAssets[name];
    if(!asset) return;
    umlTitle.textContent = asset.title;
    umlImage.src = asset.image;
    umlImage.alt = asset.alt;
    umlDownload.href = asset.source;
    umlDownload.setAttribute('download',asset.source.split('/').pop());
  }

  function setUmlZoom(value){
    umlZoom = clamp(.55,1.8,value);
    var baseWidth = window.innerWidth <= 600 ? 960 : (window.innerWidth <= 900 ? 1050 : 1120);
    umlImage.style.width = Math.round(baseWidth*umlZoom)+'px';
    umlZoomLevel.textContent = Math.round(umlZoom*100)+'%';
  }

  function showFolderPane(pane,focusTab){
    activeFolderPane = pane === 'uml' ? 'uml' : 'demo';
    views.forEach(function(view){
      view.hidden = activeFolderPane !== 'demo' || view.getAttribute('data-demo-view') !== activeDemo;
    });
    umlView.hidden = activeFolderPane !== 'uml';
    folderTabs.forEach(function(tab){
      var selected = tab.getAttribute('data-folder-pane') === activeFolderPane;
      tab.classList.toggle('active',selected);
      tab.setAttribute('aria-selected',selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
      if(selected && focusTab) tab.focus();
    });
    if(activeFolderPane === 'uml'){
      setUmlZoom(1);
      window.requestAnimationFrame(function(){
        umlViewport.scrollLeft = 0;
        umlViewport.scrollTop = 0;
      });
    }
  }

  function openDemo(name,trigger){
    activeDemo = name;
    lastTrigger = trigger;
    configureUml(name);
    showFolderPane('demo',false);
    modalTitle.textContent = name === 'flight' ? 'Flight Arbitrage Optimizer' : 'WordHunt Neural Solver';
    modal.classList.remove('open');
    void modal.offsetWidth;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('project-demo-open');
    document.body.classList.add('project-demo-open');
    if(name === 'flight'){ initializeFlight(); }
    if(name === 'wordhunt'){ initializeWordhunt(); }
    window.setTimeout(function(){ closeButton.focus(); }, reducedMotion ? 0 : 850);
  }

  function closeDemo(){
    if(!modal.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('project-demo-open');
    document.body.classList.remove('project-demo-open');
    activeDemo = null;
    if(lastTrigger) lastTrigger.focus();
  }

  triggers.forEach(function(trigger){
    trigger.addEventListener('click',function(){ openDemo(trigger.getAttribute('data-demo'),trigger); });
  });
  folderTabs.forEach(function(tab,index){
    tab.addEventListener('click',function(){ showFolderPane(tab.getAttribute('data-folder-pane'),false); });
    tab.addEventListener('keydown',function(event){
      if(event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      var direction = event.key === 'ArrowRight' ? 1 : -1;
      var next = (index+direction+folderTabs.length)%folderTabs.length;
      showFolderPane(folderTabs[next].getAttribute('data-folder-pane'),true);
    });
  });
  umlZoomOut.addEventListener('click',function(){ setUmlZoom(umlZoom-.15); });
  umlZoomIn.addEventListener('click',function(){ setUmlZoom(umlZoom+.15); });
  umlZoomReset.addEventListener('click',function(){ setUmlZoom(1); });

  var umlDrag = null;
  umlViewport.addEventListener('pointerdown',function(event){
    if(event.button !== 0) return;
    umlDrag = {x:event.clientX,y:event.clientY,left:umlViewport.scrollLeft,top:umlViewport.scrollTop};
    umlViewport.classList.add('dragging');
    umlViewport.setPointerCapture(event.pointerId);
  });
  umlViewport.addEventListener('pointermove',function(event){
    if(!umlDrag) return;
    umlViewport.scrollLeft = umlDrag.left-(event.clientX-umlDrag.x);
    umlViewport.scrollTop = umlDrag.top-(event.clientY-umlDrag.y);
  });
  function stopUmlDrag(){ umlDrag = null; umlViewport.classList.remove('dragging'); }
  umlViewport.addEventListener('pointerup',stopUmlDrag);
  umlViewport.addEventListener('pointercancel',stopUmlDrag);
  closeButton.addEventListener('click',closeDemo);
  modal.addEventListener('click',function(event){ if(event.target === modal) closeDemo(); });
  modal.addEventListener('keydown',function(event){
    if(event.key === 'Escape'){
      event.preventDefault();
      closeDemo();
      return;
    }
    if(event.key !== 'Tab') return;
    var focusable = Array.prototype.slice.call(modal.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'))
      .filter(function(element){ return !element.closest('[hidden]'); });
    if(!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length-1];
    if(event.shiftKey && document.activeElement === first){ event.preventDefault(); last.focus(); }
    else if(!event.shiftKey && document.activeElement === last){ event.preventDefault(); first.focus(); }
  });

  /* ---------------- Flight demo ---------------- */
  var flightInitialized = false;
  var flightStartDate = document.getElementById('flightStartDate');
  var flightEndDate = document.getElementById('flightEndDate');
  var flightHome = document.getElementById('flightHome');
  var flightCities = document.getElementById('flightCities');
  var flightRun = document.getElementById('flightRun');
  var flightResults = document.getElementById('flightResults');
  var flightRouteLabel = document.getElementById('flightRouteLabel');
  var flightRouteVisual = document.getElementById('flightRouteVisual');
  var flightSummary = document.getElementById('flightSummary');
  var flightAnalysis = document.getElementById('flightAnalysis');
  var flightStatus = document.getElementById('flightStatus');
  var flightTimer = null;

  function flightCity(code){
    return data.flights.cities.find(function(city){ return city.code === code; }) || {code:code,city:code};
  }
  function selectedFlightCities(){
    return Array.prototype.slice.call(flightCities.querySelectorAll('input:checked')).map(function(input){ return input.value; });
  }
  function getDateWindow(){
    var start = new Date(flightStartDate.value+'T12:00:00');
    var end = new Date(flightEndDate.value+'T12:00:00');
    if(!flightStartDate.value || !flightEndDate.value || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
    var days = Math.round((end-start)/86400000);
    var peakMonth = [5,6,11].indexOf(start.getMonth()) >= 0 ? .06 : 0;
    return { start:start, end:end, days:days, factor:1+Math.abs(days-9)*.008+peakMonth };
  }
  function dateAdjusted(price,dateWindow){ return Math.round(price*dateWindow.factor); }
  function formatDateRange(dateWindow){
    var format = new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'});
    return format.format(dateWindow.start)+' - '+format.format(dateWindow.end);
  }
  function computeFlightArbitrage(){
    var dateWindow = getDateWindow();
    var codes = selectedFlightCities();
    if(!dateWindow) return {error:'Choose a return date after the departure date.'};
    if(codes.length < 3) return {error:'Choose at least three candidate cities so a middle insertion can be tested.'};
    var home = flightHome.value;
    var homePrices = data.flights.homeEdges[home];
    var outbound = codes.map(function(code){
      return {from:home,to:code,price:dateAdjusted(homePrices.outbound[code],dateWindow)};
    }).sort(function(a,b){ return a.price-b.price; });
    var inbound = codes.map(function(code){
      return {from:code,to:home,price:dateAdjusted(homePrices.inbound[code],dateWindow)};
    }).sort(function(a,b){ return a.price-b.price; });
    var topOutbound = outbound.slice(0,2);
    var topInbound = inbound.slice(0,2);
    var boundaryPairs = [];
    topOutbound.forEach(function(outEdge){
      topInbound.forEach(function(inEdge){
        if(outEdge.to !== inEdge.from){
          boundaryPairs.push({outbound:outEdge,inbound:inEdge,total:outEdge.price+inEdge.price});
        }
      });
    });
    boundaryPairs.sort(function(a,b){ return a.total-b.total; });
    var boundary = boundaryPairs[0];
    var conflicts = topOutbound.filter(function(outEdge){
      return topInbound.some(function(inEdge){ return inEdge.from === outEdge.to; });
    }).map(function(outEdge){
      var inEdge = topInbound.find(function(edge){ return edge.from === outEdge.to; });
      return {city:outEdge.to,outbound:outEdge.price,inbound:inEdge.price,kept:outEdge.price <= inEdge.price ? 'outbound' : 'return'};
    });
    var middleChoices = codes.filter(function(code){ return code !== boundary.outbound.to && code !== boundary.inbound.from; }).map(function(code){
      var first = dateAdjusted(data.flights.intercity[boundary.outbound.to][code],dateWindow);
      var second = dateAdjusted(data.flights.intercity[code][boundary.inbound.from],dateWindow);
      return {city:code,first:first,second:second,total:first+second};
    }).sort(function(a,b){ return a.total-b.total; });
    var middle = middleChoices[0];
    return {
      home:home,
      dateWindow:dateWindow,
      outbound:outbound,
      inbound:inbound,
      topOutbound:topOutbound,
      topInbound:topInbound,
      boundaryPairs:boundaryPairs,
      boundary:boundary,
      conflicts:conflicts,
      middleChoices:middleChoices,
      middle:middle,
      total:boundary.total+middle.total,
      edgesTested:outbound.length+inbound.length+middleChoices.length*2
    };
  }
  function edgeRows(edges,keptCodes,direction){
    return '<div class="edge-list">'+edges.map(function(edge){
      var cityCode = direction === 'outbound' ? edge.to : edge.from;
      var kept = keptCodes.indexOf(cityCode) >= 0;
      var label = direction === 'outbound' ? edge.from+' <span class="route-arrows">&rarr;</span> '+edge.to : edge.from+' <span class="route-arrows">&rarr;</span> '+edge.to;
      return '<div class="edge-row'+(kept?' kept':'')+'"><strong>'+label+(kept?'<span class="edge-badge">top edge</span>':'')+'</strong><span class="edge-price">'+money(edge.price)+'</span></div>';
    }).join('')+'</div>';
  }
  function renderFlight(result){
    if(result.error){ flightStatus.textContent = result.error; return false; }
    var pathCodes = [result.home,result.boundary.outbound.to,result.middle.city,result.boundary.inbound.from,result.home];
    var airports = pathCodes.map(function(code){
      var city = code === result.home
        ? data.flights.homes.find(function(home){ return home.code === code; })
        : flightCity(code);
      return [code,city.city];
    });
    flightRouteLabel.textContent = formatDateRange(result.dateWindow)+' / lowest-cost three-city path';
    flightRouteVisual.innerHTML = '<div class="route-path" style="--route-nodes:'+airports.length+'">'+airports.map(function(airport){
      return '<div class="route-node"><strong>'+escapeHtml(airport[0])+'</strong><small>'+escapeHtml(airport[1])+'</small></div>';
    }).join('')+'</div>';
    flightSummary.innerHTML =
      '<div class="flight-stat"><strong>'+money(result.total)+'</strong><span>Directional fare total</span></div>'+ 
      '<div class="flight-stat"><strong>3 cities</strong><span>One continuous trip</span></div>'+ 
      '<div class="flight-stat"><strong>'+result.edgesTested+'</strong><span>Price edges tested</span></div>';

    var conflictHtml = result.conflicts.length ? result.conflicts.map(function(conflict){
      var city = flightCity(conflict.city);
      var blockedDirection = conflict.kept === 'return' ? result.home+' &rarr; '+conflict.city : conflict.city+' &rarr; '+result.home;
      return '<div class="edge-row blocked"><strong>'+blockedDirection+'</strong><span class="edge-price">blocked</span></div>'+ 
        '<p>'+escapeHtml(city.city)+' appeared on both sides. Its '+conflict.kept+' edge was cheaper, so the opposite direction was removed.</p>';
    }).join('') : '<p>No city occupied both boundary lists.</p>';
    var boundaryRows = result.boundaryPairs.slice(0,3).map(function(pair,index){
      var label = pair.outbound.from+' &rarr; '+pair.outbound.to+' / '+pair.inbound.from+' &rarr; '+pair.inbound.to;
      return '<div class="edge-choice'+(index===0?' selected':'')+'"><span>'+label+(index===0?' <span class="edge-badge">selected</span>':'')+'</span><strong>'+money(pair.total)+'</strong></div>';
    }).join('');
    var middleRows = result.middleChoices.map(function(choice,index){
      var label = result.boundary.outbound.to+' &rarr; '+choice.city+' &rarr; '+result.boundary.inbound.from;
      return '<div class="edge-choice'+(index===0?' selected':'')+'"><span>'+label+(index===0?' <span class="edge-badge">inserted</span>':'')+'</span><strong>'+money(choice.total)+'</strong></div>';
    }).join('');

    flightAnalysis.innerHTML =
      '<article class="edge-step"><span class="edge-step-number">Step 01</span><h3>Rank outbound edges</h3>'+edgeRows(result.outbound,result.topOutbound.map(function(edge){ return edge.to; }),'outbound')+'<p>Keep the two cheapest ways out of '+escapeHtml(result.home)+'.</p></article>'+ 
      '<article class="edge-step"><span class="edge-step-number">Step 02</span><h3>Rank return edges</h3>'+edgeRows(result.inbound,result.topInbound.map(function(edge){ return edge.from; }),'inbound')+'<p>Rank the same cities independently in the return direction.</p></article>'+ 
      '<article class="edge-step"><span class="edge-step-number">Step 03</span><h3>Lock opposite boundaries</h3>'+boundaryRows+conflictHtml+'</article>'+ 
      '<article class="edge-step"><span class="edge-step-number">Step 04</span><h3>Insert the third city</h3>'+middleRows+'<p>Compare the two connecting edges for every city still available.</p></article>';
    flightStatus.textContent = 'Selected '+pathCodes.join(' to ')+' for '+money(result.total)+'. Each fare is evaluated directionally rather than as a round trip.';
    return true;
  }
  function runFlight(){
    window.clearTimeout(flightTimer);
    var result = computeFlightArbitrage();
    if(result.error){ renderFlight(result); return; }
    flightRun.disabled = true;
    flightRun.textContent = 'Tracing edges...';
    flightResults.classList.add('is-running');
    flightStatus.textContent = 'Ranking outbound edges, return edges, and third-city insertions.';
    flightTimer = window.setTimeout(function(){
      renderFlight(result);
      flightResults.classList.remove('is-running');
      flightRun.disabled = false;
      flightRun.textContent = 'Find directional edges';
    },reducedMotion ? 0 : 760);
  }
  function initializeFlight(){
    if(flightInitialized) return;
    flightInitialized = true;
    data.flights.homes.forEach(function(home){
      var option = document.createElement('option');
      option.value = home.code;
      option.textContent = home.code+' - '+home.city;
      flightHome.appendChild(option);
    });
    data.flights.cities.forEach(function(city){
      var label = document.createElement('label');
      label.className = 'city-choice';
      label.innerHTML = '<input type="checkbox" value="'+escapeHtml(city.code)+'" checked><span><strong>'+escapeHtml(city.city)+'</strong><small>'+escapeHtml(city.code)+'</small></span>';
      flightCities.appendChild(label);
    });
    [flightStartDate,flightEndDate,flightHome].forEach(function(input){
      input.addEventListener('change',function(){ flightStatus.textContent = 'Inputs changed. Run the edge search to recalculate the path.'; });
    });
    flightCities.addEventListener('change',function(){ flightStatus.textContent = 'Candidate cities changed. Select at least three, then run the edge search.'; });
    flightRun.addEventListener('click',runFlight);
    renderFlight(computeFlightArbitrage());
  }

  /* ---------------- WordHunt demo ---------------- */
  var wordInitialized = false;
  var wordBoardPreset = document.getElementById('wordBoardPreset');
  var wordThreshold = document.getElementById('wordThreshold');
  var wordThresholdOutput = document.getElementById('wordThresholdOutput');
  var wordRun = document.getElementById('wordRun');
  var wordGrid = document.getElementById('wordGrid');
  var wordStats = document.getElementById('wordStats');
  var wordResults = document.getElementById('wordResults');
  var wordStatus = document.getElementById('wordStatus');
  var wordTimers = [];

  function clearWordTimers(){
    wordTimers.forEach(function(timer){ window.clearTimeout(timer); });
    wordTimers = [];
  }
  function getWordBoard(){
    return data.wordhunt.find(function(board){ return board.id === wordBoardPreset.value; }) || data.wordhunt[0];
  }
  function clearWordPath(){
    Array.prototype.forEach.call(wordGrid.children,function(cell){ cell.classList.remove('is-path','is-scanning'); });
  }
  function metricsFor(board){
    var threshold = Number(wordThreshold.value);
    var delta = threshold-.58;
    var ratio = clamp(.08,.31,board.pruneRatio+delta*.42);
    var pruned = Math.round(board.candidates*ratio);
    var recall = clamp(.82,.97,board.recall-delta*.25);
    var runtime = Math.round(board.runtime*(1-(ratio-board.pruneRatio)*.7));
    return { pruned:pruned, ratio:ratio, recall:recall, runtime:runtime };
  }
  function renderWordStats(){
    var board = getWordBoard();
    var metrics = metricsFor(board);
    wordStats.innerHTML =
      '<div class="word-stat"><strong>'+board.candidates.toLocaleString('en-US')+'</strong><span>Candidate paths</span></div>'+ 
      '<div class="word-stat"><strong>'+metrics.pruned.toLocaleString('en-US')+'</strong><span>Pruned ('+Math.round(metrics.ratio*100)+'%)</span></div>'+ 
      '<div class="word-stat"><strong>'+Math.round(metrics.recall*100)+'%</strong><span>Estimated recall</span></div>'+ 
      '<div class="word-stat"><strong>'+metrics.runtime+' ms</strong><span>Pass time</span></div>';
  }
  function markActiveWord(word){
    Array.prototype.forEach.call(wordResults.children,function(button){
      button.classList.toggle('active',button.getAttribute('data-word') === word.word);
    });
  }
  function playWord(word,done){
    clearWordPath();
    markActiveWord(word);
    wordStatus.textContent = 'Replaying '+word.word+' / '+Math.round(word.confidence*100)+'% retained confidence.';
    if(reducedMotion){
      word.path.forEach(function(index){ wordGrid.children[index].classList.add('is-path'); });
      if(done) done();
      return;
    }
    word.path.forEach(function(index,step){
      wordTimers.push(window.setTimeout(function(){ wordGrid.children[index].classList.add('is-path'); },step*105));
    });
    wordTimers.push(window.setTimeout(function(){ if(done) done(); },word.path.length*105+330));
  }
  function renderWordBoard(){
    clearWordTimers();
    var board = getWordBoard();
    wordGrid.innerHTML = '';
    board.letters.forEach(function(letter,index){
      var cell = document.createElement('div');
      cell.className = 'word-cell';
      cell.setAttribute('role','gridcell');
      cell.setAttribute('aria-label','Row '+(Math.floor(index/4)+1)+', column '+(index%4+1)+': '+letter);
      cell.textContent = letter;
      wordGrid.appendChild(cell);
    });
    wordResults.innerHTML = '';
    board.words.forEach(function(word){
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'word-result';
      button.setAttribute('data-word',word.word);
      button.textContent = word.word+' '+Math.round(word.confidence*100)+'%';
      button.addEventListener('click',function(){ clearWordTimers(); playWord(word); });
      wordResults.appendChild(button);
    });
    renderWordStats();
    wordStatus.textContent = 'Board ready. Run the pass or select a retained word.';
  }
  function runWordPass(){
    clearWordTimers();
    clearWordPath();
    var board = getWordBoard();
    wordRun.disabled = true;
    wordRun.textContent = 'Pruning...';
    wordStatus.textContent = 'Scoring candidate prefixes against the selected threshold.';
    Array.prototype.forEach.call(wordGrid.children,function(cell,index){
      cell.style.animationDelay = (index*22)+'ms';
      cell.classList.add('is-scanning');
    });
    var startDelay = reducedMotion ? 0 : 600;
    wordTimers.push(window.setTimeout(function(){
      clearWordPath();
      renderWordStats();
      var sequence = board.words.slice(0,Math.min(3,board.words.length));
      var cursor = 0;
      function next(){
        if(cursor >= sequence.length){
          wordRun.disabled = false;
          wordRun.textContent = 'Run neural pass';
          wordStatus.textContent = sequence.length+' retained paths replayed. Select any word to inspect it again.';
          return;
        }
        playWord(sequence[cursor],function(){ cursor += 1; next(); });
      }
      next();
    },startDelay));
  }
  function initializeWordhunt(){
    if(wordInitialized) return;
    wordInitialized = true;
    data.wordhunt.forEach(function(board){
      var option = document.createElement('option');
      option.value = board.id;
      option.textContent = board.label;
      wordBoardPreset.appendChild(option);
    });
    wordBoardPreset.addEventListener('change',renderWordBoard);
    wordThreshold.addEventListener('input',function(){
      wordThresholdOutput.textContent = Number(wordThreshold.value).toFixed(2);
      renderWordStats();
      wordStatus.textContent = 'Threshold updated. Run the pass to replay the retained paths.';
    });
    wordRun.addEventListener('click',runWordPass);
    renderWordBoard();
  }
})();
