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
# Brachiosaurus: high shoulders, a long upright neck and a four-beat running gait.
for frame in range(8):
  phase=frame*math.pi/3
  legs=[]
  for j,(hip,y) in enumerate([(38,49),(61,44),(32,51),(67,44)]):
    if frame<6:
      stride=math.sin(phase+j*math.pi/2)*6
      foot_y=79-max(0,math.cos(phase+j*math.pi/2))*5
    elif frame==6:
      stride=-5 if j%2 else 5
      foot_y=66+j%2*4
    else:
      stride=4 if j%2 else -3
      foot_y=76+j%2*3
    foot_x=hip+stride
    color='#6e6251' if j<2 else '#ae9674'
    legs.append(f'<path d="M{hip-4} {y}Q{hip+5} {y-2} {hip+5} {y+9}L{foot_x+2:.2f} {foot_y-6:.2f}Q{foot_x+8:.2f} {foot_y-2:.2f} {foot_x+5:.2f} {foot_y:.2f}L{foot_x-5:.2f} {foot_y:.2f}L{foot_x-4:.2f} {foot_y-5:.2f}L{hip-5} {y+12}Z" fill="{color}" stroke="#574f43" stroke-width=".65"/>')
  body=''.join(legs[:2])
  body+='<path d="M34 41Q24 43 15 39L2 34Q12 46 27 48L34 49Z" fill="#a58e6f" stroke="#574f43" stroke-width=".7"/>'
  body+='<path d="M27 46Q27 37 41 35Q54 35 64 29Q69 24 70 14L70 9Q77 4 83 8L91 9Q95 12 91 16L80 17Q79 29 76 40Q72 51 62 53Q48 60 34 54Q27 52 27 46Z" fill="#ae9674" stroke="#574f43" stroke-width=".85"/>'
  body+='<path d="M30 42Q43 35 61 35Q71 28 73 13L75 9Q79 7 83 9L88 10Q83 11 78 13Q77 30 69 39Q48 41 34 46Z" fill="#d6c3a1" opacity=".82"/>'
  body+='<path d="M32 49Q47 56 62 49Q72 45 75 32M65 40Q70 37 71 31M74 19L78 19M79 14L89 14" fill="none" stroke="#7c6c55" stroke-width=".8"/>'
  body+=''.join(legs[2:])
  body+='<path d="M35 50L36 66M68 46L69 64" stroke="#d6c3a1" stroke-width="1.2" opacity=".6"/>'
  for x,y in [(37,44),(44,46),(52,43),(58,40),(49,51),(62,47),(72,26),(73,22),(80,11)]:
    body+=f'<path d="M{x} {y}l1 2m2-1l1 2" stroke="#75664f" stroke-width=".55" opacity=".5"/>'
  body+='<circle cx="83" cy="10.5" r=".85" fill="#171712"/><circle cx="83.2" cy="10.2" r=".22" fill="#e9e4d8"/><path d="M89 11.5h1" stroke="#574f43" stroke-width=".6"/>'
  save(f'brachiosaurus-{frame}',96,80,body)
# Reusable obstacle plates: generous visual skirts outside precise collision solids.
for kind in ['rock','root','branch']:
  if kind=='rock':
    b='<path d="M3 80L12 42L31 14L65 4L82 26L96 49L102 80Z" fill="#10110f"/><path d="M12 42L44 28L65 4L62 40L96 49M44 28L31 67L62 40L80 73" fill="none" stroke="#b7a68a" stroke-width="2"/><path d="M15 65L34 45M19 74L34 56M62 49L84 62M67 60L87 72" stroke="#53654b" stroke-width="1.5"/>'
  else:
    b='<path d="M0 80L11 57L37 51L27 24L18 8L27 4L46 26L53 49L71 48L84 23L89 26L85 51L106 64L109 80Z" fill="#10110f"/><path d="M13 68L45 62L40 34M47 71L73 59L84 35" stroke="#b7a68a" stroke-width="2" fill="none"/>'
    if kind=='branch': b+='<path d="M36 41L42 50L48 43L52 64L61 53L57 74" fill="#f05a38"/><path d="M47 64L50 58L54 72" fill="#e9e4d8"/>'
  save(kind,110,84,b)
print('Authored 35 vector plates')
