(() => {
'use strict';

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';

const formats = {
  town: [
    ['90 × 60 mm',90,60],
    ['135 × 90 mm',135,90],
    ['225 × 150 mm',225,150]
  ],
  plate1: [
    ['520 × 110 mm',520,110],
    ['460 × 110 mm',460,110],
    ['420 × 110 mm',420,110],
    ['340 × 110 mm',340,110]
  ],
  plate2: [
    ['340 × 200 mm',340,200],
    ['255 × 130 mm',255,130],
    ['220 × 200 mm',220,200],
    ['180 × 200 mm',180,200]
  ]
};

const defaults = {
  town: {
    text1:'Ehehafen', text2:'Singleleben',
    bg:'#c7a027', fg:'#202020', accent:'#c5281c',
    topScales:[78], bottomScales:[70], borderWidth:2.4, radius:3.5
  },
  plate1: {
    text1:'M AB 1234', text2:'',
    bg:'#f7f7f2', fg:'#111111', accent:'#174b9b',
    topScales:[82], bottomScales:[70], borderWidth:0.8, radius:2.4
  },
  plate2: {
    text1:'M AB', text2:'1234',
    bg:'#f7f7f2', fg:'#111111', accent:'#174b9b',
    topScales:[78], bottomScales:[78], borderWidth:0.8, radius:2.4
  }
};

let topScales = [78];
let bottomScales = [70];

function svgEl(name, attrs = {}, text = '') {
  const node = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([key,value]) => node.setAttribute(key,value));
  if (text !== '') node.textContent = text;
  return node;
}

function fitText(text, maxWidth, startSize, fontFamily, weight = 700) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let size = Math.max(1,startSize);
  while (size > 1) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 0.5;
  }
  return size;
}

function addText(svg, txt, x, y, size, color, family, weight = 700, anchor = 'middle') {
  svg.appendChild(svgEl('text', {
    x, y, fill: color,
    'font-family': family,
    'font-size': size,
    'font-weight': weight,
    'font-stretch': 'condensed',
    'text-anchor': anchor,
    'dominant-baseline': 'middle',
    'letter-spacing': Number($('tracking').value)
  }, txt));
}

function roundedRect(svg,x,y,w,h,r,fill,stroke,sw) {
  svg.appendChild(svgEl('rect',{x,y,width:w,height:h,rx:r,fill,stroke,'stroke-width':sw}));
}

function splitLines(value) {
  const lines = String(value ?? '').replace(/\r/g,'').split('\n');
  return lines.length ? lines : [''];
}

function syncScaleArray(lines, scales, fallback) {
  const next = lines.map((_,i) => Number.isFinite(scales[i]) ? scales[i] : (Number.isFinite(scales[scales.length-1]) ? scales[scales.length-1] : fallback));
  return next;
}

function renderLineSizeControls(kind) {
  const isTop = kind === 'top';
  const textarea = $(isTop ? 'text1' : 'text2');
  const container = $(isTop ? 'topLineSizes' : 'bottomLineSizes');
  const lines = splitLines(textarea.value);
  const fallback = isTop ? 78 : 70;

  if (isTop) topScales = syncScaleArray(lines, topScales, fallback);
  else bottomScales = syncScaleArray(lines, bottomScales, fallback);

  const scales = isTop ? topScales : bottomScales;
  container.innerHTML = '';

  if ($('type').value === 'plate1' && !isTop) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');

  lines.forEach((line,index) => {
    const item = document.createElement('div');
    item.className = 'line-size-item';

    const head = document.createElement('div');
    head.className = 'line-size-head';
    const strong = document.createElement('strong');
    strong.textContent = `${isTop ? 'Oben' : 'Unten'} · Zeile ${index+1}`;
    const preview = document.createElement('span');
    preview.textContent = line || '(leer)';
    head.append(strong,preview);

    const control = document.createElement('div');
    control.className = 'line-size-control';
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '20';
    range.max = '120';
    range.step = '1';
    range.value = String(scales[index]);
    const out = document.createElement('output');
    out.textContent = `${range.value} %`;

    range.addEventListener('input',() => {
      const value = Number(range.value);
      if (isTop) topScales[index] = value;
      else bottomScales[index] = value;
      out.textContent = `${value} %`;
      render();
    });

    control.append(range,out);
    item.append(head,control);
    container.appendChild(item);
  });
}

function refreshLineControls() {
  renderLineSizeControls('top');
  renderLineSizeControls('bottom');
}

function buildFormats() {
  const type = $('type').value;
  $('format').innerHTML = '';
  formats[type].forEach(([label,w,h],index) => {
    const option = document.createElement('option');
    option.value = `${w}x${h}`;
    option.textContent = label;
    option.selected = index === 0;
    $('format').appendChild(option);
  });
  const [w,h] = $('format').value.split('x');
  $('widthMm').value = w;
  $('heightMm').value = h;
}

function applyDefaults() {
  const d = defaults[$('type').value];
  $('text1').value = d.text1;
  $('text2').value = d.text2;
  $('bgColor').value = d.bg;
  $('fgColor').value = d.fg;
  $('accentColor').value = d.accent;
  $('borderWidth').value = d.borderWidth;
  $('radius').value = d.radius;
  $('tracking').value = 0;
  topScales = [...d.topScales];
  bottomScales = [...d.bottomScales];
  refreshLineControls();
}

function updateVisibility() {
  const type = $('type').value;
  const isTown = type === 'town';
  $('slashWrap').classList.toggle('hidden', !isTown);
  $('euroWrap').classList.toggle('hidden', isTown);
  $('sealsWrap').classList.toggle('hidden', isTown);
  $('text2Wrap').classList.toggle('hidden', type === 'plate1');
  $('bottomLineSizes').classList.toggle('hidden', type === 'plate1');
  $('accentWrap').classList.toggle('hidden', !isTown);
}

function drawEuroBand(svg,W,H) {
  const bandW = H * 0.27;
  svg.appendChild(svgEl('rect',{x:0,y:0,width:bandW,height:H,fill:'#174b9b'}));
  const cx = bandW/2, cy = H*0.28, rr = H*0.115;
  for (let i=0;i<12;i++) {
    const a = -Math.PI/2 + i*Math.PI*2/12;
    const sx = cx + Math.cos(a)*rr;
    const sy = cy + Math.sin(a)*rr;
    svg.appendChild(svgEl('circle',{cx:sx,cy:sy,r:H*0.011,fill:'#ffd700'}));
  }
  addText(svg,'D',cx,H*0.76,H*0.27,'white',
    '"Arial Narrow","Bahnschrift Condensed","DejaVu Sans Condensed",sans-serif',700);
  return bandW;
}

function drawSeal(svg,cx,cy,r,outer,inner) {
  svg.appendChild(svgEl('circle',{cx,cy,r,fill:outer,stroke:'#333','stroke-width':r*0.05}));
  svg.appendChild(svgEl('circle',{cx,cy,r:r*0.68,fill:inner,stroke:'#666','stroke-width':r*0.04}));
  for(let i=0;i<12;i++){
    const a=i*Math.PI*2/12;
    svg.appendChild(svgEl('circle',{
      cx:cx+Math.cos(a)*r*0.48,
      cy:cy+Math.sin(a)*r*0.48,
      r:r*0.045,fill:'#333'
    }));
  }
}

function drawTextBlock(svg, lines, scales, x, yTop, blockH, maxWidth, family, color, weight=400, anchor='middle') {
  const count = Math.max(1, lines.length);
  const bandH = blockH / count;
  lines.forEach((line,index) => {
    const scale = Math.max(20,Math.min(120,Number(scales[index] ?? 70))) / 100;
    const desired = bandH * 0.90 * scale;
    const fitted = fitText(line || ' ', maxWidth, desired, family, weight);
    const y = yTop + bandH*(index+0.5);
    addText(svg,line,x,y,fitted,color,family,weight,anchor);
  });
}

// Spezielle Typografie für GENAU zwei Zeilen im oberen Ortsschild-Feld.
// Zeile 1 ist immer die Hauptzeile und bleibt im finalen Rendering sichtbar
// größer als Zeile 2 – auch dann, wenn Zeile 1 wegen ihrer Länge stärker
// auf die verfügbare Breite eingepasst werden muss.
function drawTownTopTextBlock(svg, lines, scales, x, yTop, blockH, maxWidth, family, color, weight=400) {
  if (lines.length !== 2) {
    drawTextBlock(svg,lines,scales,x,yTop,blockH,maxWidth,family,color,weight,'middle');
    return;
  }

  const primaryScale = Math.max(20,Math.min(120,Number(scales[0] ?? 78))) / 100;
  const secondaryScale = Math.max(20,Math.min(120,Number(scales[1] ?? 70))) / 100;
  const bandH = blockH / 2;

  // Beide Slider bleiben wirksam. Die erste Zeile erhält etwas mehr typografischen
  // Spielraum; anschließend werden beide Texte wie bisher auf die Breite gefittet.
  const primaryDesired = bandH * 0.96 * primaryScale;
  const secondaryDesired = bandH * 0.90 * secondaryScale;

  const primarySize = fitText(lines[0] || ' ', maxWidth, primaryDesired, family, weight);
  let secondarySize = fitText(lines[1] || ' ', maxWidth, secondaryDesired, family, weight);

  // Harte Gestaltungsregel: Zeile 2 darf final nie gleich groß oder größer sein.
  // 84 % ergeben eine klar sichtbare, aber weiterhin harmonische Hierarchie.
  const secondaryMax = primarySize * 0.84;
  secondarySize = Math.min(secondarySize, secondaryMax);

  // Den Zweizeiler als gemeinsamen Block vertikal zentrieren.
  // Zwischen Hauptzeile und Unterzeile liegt bewusst ein halber Zeilenabstand,
  // bezogen auf die kleinere der beiden tatsächlichen Schriftgrößen.
  const gap = Math.min(primarySize,secondarySize) * 0.50;
  const totalH = primarySize + gap + secondarySize;
  const centerY = yTop + blockH/2;
  const firstY = centerY - totalH/2 + primarySize/2;
  const secondY = centerY + totalH/2 - secondarySize/2;

  addText(svg,lines[0],x,firstY,primarySize,color,family,weight,'middle');
  addText(svg,lines[1],x,secondY,secondarySize,color,family,weight,'middle');
}

function renderTown(svg,W,H,bg,fg,accent,bw,r) {
  // 1) Grundfläche
  roundedRect(svg,1,1,W-2,H-2,r,bg,'none',0);

  const mid = H/2;
  const dividerWidth = bw*0.65;
  const family = '"Bahnschrift","DIN Alternate","Arial",sans-serif';
  const topLines = splitLines($('text1').value);
  const bottomLines = splitLines($('text2').value);

  // Exakte innere Begrenzung des schwarzen Rahmens.
  // Der Rahmen wird als Stroke auf einer abgerundeten Rechteckbahn gezeichnet;
  // daher liegt seine innere Kante bei x/y = bw und der innere Radius ist
  // r - bw/2.
  const xL = bw;
  const xR = W - bw;
  const yT = mid;
  const yB = H - bw;
  const innerR = Math.max(0, r - bw/2);

  // Clip-Pfad = tatsächlich sichtbares gelbes unteres Innenfeld.
  // Oben gerade an der Trennlinie, unten exakt mit dem inneren Eckenradius.
  let lowerFieldPath;
  if (innerR > 0.01) {
    lowerFieldPath = [
      `M ${xL} ${yT}`,
      `L ${xR} ${yT}`,
      `L ${xR} ${yB-innerR}`,
      `A ${innerR} ${innerR} 0 0 1 ${xR-innerR} ${yB}`,
      `L ${xL+innerR} ${yB}`,
      `A ${innerR} ${innerR} 0 0 1 ${xL} ${yB-innerR}`,
      'Z'
    ].join(' ');
  } else {
    lowerFieldPath = `M ${xL} ${yT} L ${xR} ${yT} L ${xR} ${yB} L ${xL} ${yB} Z`;
  }

  if ($('showSlash').checked) {
    const defs = svgEl('defs');
    const clip = svgEl('clipPath', {
      id: 'townLowerClip',
      clipPathUnits: 'userSpaceOnUse'
    });
    clip.appendChild(svgEl('path',{d:lowerFieldPath}));
    defs.appendChild(clip);
    svg.appendChild(defs);

    // 2) Roter Ortsausgangsbalken
    // Die MITTELLINIE verläuft mathematisch exakt durch die beiden
    // gegenüberliegenden Ecken des rechteckigen unteren Innenfelds:
    //   links unten  = (xL, yB)
    //   rechts oben  = (xR, yT)
    // Bei 3:2-Schildern ergibt sich daraus automatisch der gewünschte
    // Referenzwinkel von ca. 18–19°. Keine Padding-/Safe-Abstände.
    const cornerLX = xL;
    const cornerLY = yB;
    const cornerRX = xR;
    const cornerRY = yT;

    const baseDx = cornerRX - cornerLX;
    const baseDy = cornerRY - cornerLY;
    const baseLen = Math.hypot(baseDx,baseDy) || 1;
    const ux = baseDx/baseLen;
    const uy = baseDy/baseLen;

    // Balkendicke aus dem Referenzbild: ca. 8–9 % der Schildhöhe.
    const thick = H*0.086;
    const half = thick/2;

    // Normalvektor für konstante, rechteckige Balkendicke.
    const nx = -uy;
    const ny = ux;

    // Balken bewusst weit über beide Ecken hinaus verlängern.
    // Sichtbare Enden entstehen ausschließlich durch den Clip-Pfad.
    const extend = Math.max(W,H)*2;
    const ax = cornerLX - ux*extend;
    const ay = cornerLY - uy*extend;
    const bx = cornerRX + ux*extend;
    const by = cornerRY + uy*extend;

    svg.appendChild(svgEl('polygon',{
      points:[
        `${ax+nx*half},${ay+ny*half}`,
        `${bx+nx*half},${by+ny*half}`,
        `${bx-nx*half},${by-ny*half}`,
        `${ax-nx*half},${ay-ny*half}`
      ].join(' '),
      fill:accent,
      'clip-path':'url(#townLowerClip)'
    }));
  }

  // 3) Rahmen und Trennlinie ÜBER dem Rot.
  roundedRect(svg,bw/2,bw/2,W-bw,H-bw,r,'none',fg,bw);
  svg.appendChild(svgEl('line',{
    x1:bw,y1:mid,x2:W-bw,y2:mid,
    stroke:fg,'stroke-width':dividerWidth
  }));

  // 4) Texte ganz oben in der Layer-Reihenfolge.
  // Oberer Text darf fast die komplette tatsächlich nutzbare Innenbreite verwenden.
  // Zuvor begrenzte W*0.88 die Zeilen künstlich auf 88 % der Schildbreite;
  // dadurch konnte eine lange Hauptzeile trotz höherem Größenregler nicht größer werden.
  // Jetzt bleibt nur ein sehr kleiner optischer Innenabstand zum schwarzen Rahmen.
  const topTextSideGap = Math.max(W*0.006, bw*0.20);
  const topTextMaxWidth = Math.max(10, (W - 2*bw) - 2*topTextSideGap);
  drawTownTopTextBlock(svg,topLines,topScales,W/2,bw*1.15,mid-bw*1.7,topTextMaxWidth,family,fg,400);
  drawTextBlock(svg,bottomLines,bottomScales,W/2,mid+bw*0.65,H-mid-bw*1.8,W*0.80,family,fg,400);
}

function renderPlate(svg,W,H,twoLine,bg,fg,bw,r) {
  const family = '"Bahnschrift Condensed","Arial Narrow","DejaVu Sans Condensed","Liberation Sans Narrow",sans-serif';
  roundedRect(svg,1,1,W-2,H-2,r,bg,fg,bw);

  let left = H*0.07;
  if ($('showEuro').checked) left = drawEuroBand(svg,W,H) + H*0.07;
  const right = W - H*0.06;
  const available = right-left;

  const topLines = splitLines($('text1').value);
  const bottomLines = splitLines($('text2').value);

  if (!twoLine) {
    drawTextBlock(svg, topLines, topScales, left, H*0.12, H*0.76, available, family, fg, 700, 'start');

    if ($('showSeals').checked) {
      const sealX = left + available*0.38;
      drawSeal(svg,sealX,H*0.35,H*0.12,'#f6f6f6','#8bb8d9');
      drawSeal(svg,sealX,H*0.68,H*0.12,'#f6f6f6','#e0c15d');
    }
  } else {
    drawTextBlock(svg, topLines, topScales, left, H*0.08, H*0.38, available, family, fg, 700, 'start');
    drawTextBlock(svg, bottomLines, bottomScales, left, H*0.54, H*0.38, available, family, fg, 700, 'start');

    if ($('showSeals').checked) {
      const sealX = W-H*0.18;
      drawSeal(svg,sealX,H*0.27,H*0.09,'#f6f6f6','#8bb8d9');
      drawSeal(svg,sealX,H*0.50,H*0.09,'#f6f6f6','#e0c15d');
    }
  }
}

function render() {
  updateVisibility();

  const svg = $('preview');
  const W = Math.max(20,Number($('widthMm').value));
  const H = Math.max(20,Number($('heightMm').value));
  const type = $('type').value;
  const bg = $('bgColor').value;
  const fg = $('fgColor').value;
  const accent = $('accentColor').value;
  const bw = W*Number($('borderWidth').value)/100;
  const r = Math.min(W,H)*Number($('radius').value)/100;

  svg.innerHTML = '';
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.setAttribute('width',W);
  svg.setAttribute('height',H);

  if (type === 'town') renderTown(svg,W,H,bg,fg,accent,bw,r);
  if (type === 'plate1') renderPlate(svg,W,H,false,bg,fg,bw,r);
  if (type === 'plate2') renderPlate(svg,W,H,true,bg,fg,bw,r);

  const dpi = Number($('dpi').value);
  $('meta').textContent = `${W} × ${H} mm · ${Math.round(W/25.4*dpi)} × ${Math.round(H/25.4*dpi)} px`;
}

function updateLabels() {
  ['borderWidth','radius'].forEach(id => {
    $(id+'Val').textContent = $(id).value + ' %';
  });
  $('trackingVal').textContent = $('tracking').value;
}

function serializeSvg() {
  const clone = $('preview').cloneNode(true);
  clone.setAttribute('xmlns',NS);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    new XMLSerializer().serializeToString(clone);
}

function safeName(value) {
  return (value || 'schild').split('\n')[0].toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function downloadBlob(blob,filename) {
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}

$('type').addEventListener('change',() => {
  buildFormats();
  applyDefaults();
  updateLabels();
  render();
});

$('format').addEventListener('change',() => {
  const [w,h]=$('format').value.split('x');
  $('widthMm').value=w;
  $('heightMm').value=h;
  render();
});

['text1','text2'].forEach(id => {
  $(id).addEventListener('input',() => {
    refreshLineControls();
    render();
  });
});

[
  'showSlash','showEuro','showSeals',
  'widthMm','heightMm','dpi',
  'borderWidth','radius','tracking','bgColor','fgColor','accentColor'
].forEach(id => {
  const node=$(id);
  node.addEventListener(['number','range','color'].includes(node.type)?'input':'change',() => {
    updateLabels();
    render();
  });
});

$('svgBtn').addEventListener('click',() => {
  downloadBlob(
    new Blob([serializeSvg()],{type:'image/svg+xml;charset=utf-8'}),
    `${safeName($('type').value)}-${safeName($('text1').value)}.svg`
  );
});

$('pngBtn').addEventListener('click',() => {
  const W=Number($('widthMm').value);
  const H=Number($('heightMm').value);
  const dpi=Number($('dpi').value);
  const pxW=Math.round(W/25.4*dpi);
  const pxH=Math.round(H/25.4*dpi);

  const url=URL.createObjectURL(new Blob([serializeSvg()],{type:'image/svg+xml'}));
  const image=new Image();

  image.onload=() => {
    const canvas=document.createElement('canvas');
    canvas.width=pxW;
    canvas.height=pxH;
    canvas.getContext('2d').drawImage(image,0,0,pxW,pxH);
    URL.revokeObjectURL(url);

    canvas.toBlob(blob => downloadBlob(
      blob,
      `${safeName($('type').value)}-${safeName($('text1').value)}-${dpi}dpi.png`
    ),'image/png');
  };

  image.src=url;
});

$('resetBtn').addEventListener('click',() => {
  $('type').value='town';
  $('showSlash').checked=true;
  $('showEuro').checked=true;
  $('showSeals').checked=true;
  $('dpi').value='300';
  buildFormats();
  applyDefaults();
  updateLabels();
  render();
});

buildFormats();
applyDefaults();
updateLabels();
render();
})();
