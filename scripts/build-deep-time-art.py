"""Original vector plates for DEEP TIME. Reproducible, no third-party artwork."""
from pathlib import Path
import math
OUT=Path('public/deep-time'); OUT.mkdir(exist_ok=True)
def save(name,w,h,body):
    (OUT/(name+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>')
rex='M20 206 C88 206 170 174 244 131 C292 105 343 82 392 105 C423 74 466 48 510 44 L570 42 Q589 47 583 68 L563 76 L580 93 L577 110 L514 111 L484 142 L465 168 Q428 185 394 181 L338 185 Q279 187 253 183 C167 213 86 219 20 206 Z'
tri='M14 135 Q77 141 138 105 C167 63 221 46 277 56 L319 69 C336 53 351 47 354 75 L383 52 L374 87 L421 93 L400 107 L426 108 L416 127 L369 140 L336 144 C302 162 256 169 210 157 L168 147 Q84 158 14 135 Z'
for animal,w,h,path in [('rex',610,310,rex),('tri',450,240,tri)]:
  for depth in ['far','mid','near']:
    for frame in range(4):
      ink={'far':'#777866','mid':'#30382e','near':'#10110f'}[depth]
      rim={'far':'#aaa78b','mid':'#91987b','near':'#b7a68a'}[depth]
      body=f'<path d="{path}" fill="{ink}" stroke="{rim}" stroke-width="1.6"/>'
      phase=frame*math.pi/2
      if animal=='rex':
        for j in range(2):
          stride=math.sin(phase+j*math.pi)*24
          body+=f'<path d="M{320+j*58} 165 Q{338+j*58} 199 {333+j*58+stride} 232 L{319+j*58+stride} 279 L{350+j*58+stride} 282 L{352+j*58+stride} 291 L{309+j*58+stride} 291 L{316+j*58+stride} 226 Q{292+j*58} 205 {292+j*58} 171Z" fill="{ink}" stroke="{rim}" stroke-width="1"/>'
        body+=f'<path d="M466 151L483 174L502 165M505 65Q540 58 564 60M511 89L560 95M301 157Q365 127 410 134" fill="none" stroke="{rim}" stroke-width="2.2"/>'
        body+='<circle cx="539" cy="56" r="3.2" fill="#e9e4d8"/><path d="M522 93l5 10 5-9 5 10 5-9 5 9 5-8" fill="#e9e4d8"/>'
        body+='<path d="M254 126Q321 79 390 93L382 103Q317 96 263 137" fill="#53654b" opacity=".42"/>'
        hatch_start,hatch_end,hatch_y=268,421,153
      else:
        for j,x in enumerate([187,226,298,337]):
          stride=math.sin(phase+(j%2)*math.pi)*14
          body+=f'<path d="M{x} 140L{x+16} 143L{x+stride+13} 205L{x+stride+25} 217L{x+stride-1} 219L{x+stride-10} 205Z" fill="{ink}" stroke="{rim}" stroke-width="1"/>'
        body+='<path d="M347 88L363 30L369 87M369 99L417 64L386 108M404 101L432 86L413 110" fill="#b7a68a"/>'
        body+=f'<path d="M324 70Q348 99 335 138M153 110Q225 79 302 93M325 82l-7 13 6 9-6 12 9 13M161 116Q191 156 254 144" fill="none" stroke="{rim}" stroke-width="2"/>'
        body+='<circle cx="377" cy="112" r="2.6" fill="#e9e4d8"/>'
        hatch_start,hatch_end,hatch_y=180,310,112
      if depth!='far':
        for x in range(hatch_start,hatch_end,9):
          body+=f'<path d="M{x} {hatch_y}l-8 20m10-8l-6 13" stroke="{rim}" stroke-width=".8" opacity=".28"/>'
      if depth=='near':
        body+=f'<path d="{path}" fill="none" stroke="#e9e4d8" stroke-width=".9" opacity=".52"/>'
      save(f'{animal}-{depth}-{frame}',w,h,body)
# Scientific field runner: readable bone silhouette, rust cloth and articulated poses.
for frame in range(8):
  airborne=frame>=6
  phase=frame*math.pi/3
  foot1=20+math.sin(phase)*12 if not airborne else 10
  foot2=20-math.sin(phase)*12 if not airborne else 33
  footy1=67-max(0,math.cos(phase))*8 if not airborne else 54
  footy2=67-max(0,-math.cos(phase))*8 if not airborne else 60
  body='<path d="M20 24L28 25L28 43L19 44L15 33Z" fill="#e9e4d8"/>'
  body+=f'<path d="M20 43L15 50L{foot1} {footy1}L{foot1+7} {footy1}M27 43L30 50L{foot2} {footy2}L{foot2+7} {footy2}" fill="none" stroke="#e9e4d8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
  body+='<path d="M20 27L13 37L6 33M26 28L32 34L38 29" fill="none" stroke="#b7a68a" stroke-width="4" stroke-linecap="round"/>'
  body+='<path d="M17 25L9 26L3 23L0 27L14 31L27 28Z" fill="#a94732"/><rect x="10" y="29" width="7" height="12" rx="2" fill="#53654b"/>'
  body+='<path d="M17 21L17 10Q24 4 29 11L30 17L27 20L27 24Z" fill="#e9e4d8"/><path d="M17 13L30 13L32 16L22 18L17 17Z" fill="#10110f"/><path d="M21 13L28 14" stroke="#b7a68a" stroke-width="1.5"/>'
  save(f'runner-{frame}',44,70,body)
# Reusable obstacle plates: generous visual skirts outside precise collision solids.
for kind in ['rock','root','branch']:
  if kind=='rock':
    b='<path d="M3 80L12 42L31 14L65 4L82 26L96 49L102 80Z" fill="#10110f"/><path d="M12 42L44 28L65 4L62 40L96 49M44 28L31 67L62 40L80 73" fill="none" stroke="#b7a68a" stroke-width="2"/><path d="M15 65L34 45M19 74L34 56M62 49L84 62M67 60L87 72" stroke="#53654b" stroke-width="1.5"/>'
  else:
    b='<path d="M0 80L11 57L37 51L27 24L18 8L27 4L46 26L53 49L71 48L84 23L89 26L85 51L106 64L109 80Z" fill="#10110f"/><path d="M13 68L45 62L40 34M47 71L73 59L84 35" stroke="#b7a68a" stroke-width="2" fill="none"/>'
    if kind=='branch': b+='<path d="M36 41L42 50L48 43L52 64L61 53L57 74" fill="#f05a38"/><path d="M47 64L50 58L54 72" fill="#e9e4d8"/>'
  save(kind,110,84,b)
print('Authored 35 vector plates')
