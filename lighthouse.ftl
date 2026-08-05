@FTL-1
SEED:: "an old lighthouse keeper repairing the great lamp as a storm closes in"
LAW::  ID > AR > MO > WO > DE

NODE keeper [ID]
  form: man in his seventies; stocky, slightly stooped; white stubble; deep
        crow's feet; heavy brows; broad weathered hands, calloused fingertips
  mat:  salt-cracked skin; coarse oat wool sweater flecked with lint; brass-
        buttoned keeper's waistcoat gone soft with age
  mot:  unhurried, economical; hands work from memory; pauses to listen to
        the weather before each task
  lit:  lamplight warms one side of the face; storm light cools the other
  snd:  low hum under his breath; slow steady breathing; knuckles click
  phy:  sure-footed on iron stairs; sweater fibers stir in drafts

NODE craft [AR]
  form: leather tool roll, cotton rags, wick scissors, long-spouted oil can
  mat:  brass gone amber with age; oil-stained rag; leather worn to a shine
  mot:  precise small gestures -- polishing arcs, three drops of oil, a
        quarter-turn of a screw
  snd:  cloth squeak on glass, small metal taps, oil gurgle
  phy:  rag drags on glass; falling oil drops catch the light

NODE storm [MO]
  mot:  rising urgency under calm; the room darkens in slow pulses
  lit:  flickers of far lightning through the lantern glass
  snd:  wind building around the tower, first rain on the panes, far thunder
  phy:  drafts move dust; the tower faintly hums in gusts

NODE tower [WO]
  form: round lantern room atop a stone lighthouse; a great Fresnel lens
        like a glass beehive; iron spiral stair below
  mat:  whitewashed stone, riveted iron, a century of paint layers, salt
        bloom on the storm panes
  lit:  the lamp is the sun of the room; everything is lit by it or by sky
  snd:  foghorn far below, gulls sheltering, sea on rocks
  phy:  everything bolted against wind; brass polished by decades of hands

NODE scene [DE]
  form: the lantern room at dusk, storm front minutes away
  mot:  arc across shots: climb and arrive -> repair the lamp -> first light
        against the dark

RESOLVE:: storm urgency (x) keeper.mot -> urgency lives in the weather, never in
  his hands: he stays slow while the room darkens faster around him
RESOLVE:: blazing lamp (x) shallow depth of field -> when lit, the lamp blooms
  with halation but focus stays on hands and face
RESOLVE:: gale outside (x) lantern room -> wind is heard and seen through glass;
  inside there are only drafts

FREEZE $BIBLE { An old lighthouse keeper in his seventies — THE SAME MAN in
  every shot: a square, deeply lined face; a flattened, once-broken nose; small
  pale-grey eyes under heavy white brows; short-cropped white beard and stubble;
  thick white hair combed back; a small scar splitting his left eyebrow. Stocky
  and slightly stooped, broad weathered hands with calloused fingertips. He
  ALWAYS wears, in every shot, all of: a coarse oat-colored wool sweater flecked
  with lint, a dark brown brass-buttoned keeper's waistcoat gone soft with age
  over the sweater, and dark canvas trousers. He moves unhurried and economical,
  hands working from memory, humming low under his breath. His presence marks
  the world: his boots leave faint damp prints on the iron, his rag leaves
  clean arcs through the dust, and the rail he always grips is polished to a
  shine. }

FREEZE $WORLD { The round lantern room at the top of an old stone lighthouse at
  dusk: a great Fresnel lens like a glass beehive at the center, riveted iron
  floor, whitewashed stone, brass fittings polished by decades of hands, salt
  bloom on the tall storm panes. Outside, a black storm front closes over a grey
  sea; gulls shelter on the gallery rail; a foghorn sounds far below. The room
  reacts to everything: dust stirs at each step, the iron rings faintly
  underfoot, and the lantern flame answers every draft. }

LOOK {
  time: LOCKED at dusk under a black storm front, in every shot -- dim
    slate-blue failing light, never daytime, never clear sky
  dof: shallow, f1.8-2.8, one sharp subject plane, creamy falloff
  grain: fine 35mm, gentle halation on the lamp and the lightning
  palette: oiled brass, oat wool, whitewash grey; slate-blue storm shadows
  light-source: every shot lit by a nameable source -- the great lamp, the storm
    sky, his hand lantern
  camera-speed: slow or locked; the weather moves, the camera barely does
  set-lock: ONE lighthouse, identical in every shot -- the same round lantern
    room, the same beehive Fresnel lens, the same whitewashed stone and
    riveted iron
}

ZONE:: lantern-room/lens  vis(1,2,3,4)
  set{ the great Fresnel lens, concentric glass rings, fully intact, one prism
       carrying a single fine hairline flaw }
  bg{ the glass ticks faintly as it cools with the falling temperature }
  + lantern-room/lens/flawed-prism: a hairline seam inside the glass, catching
    flickers -- the lens is NOT broken, the flaw is subtle
ZONE:: lantern-room/storm-panes  vis(1,3)
  set{ tall storm windows, salt bloom in the corners, old putty repairs }
  bg{ the first raindrops hit and crawl sideways in the wind }
ZONE:: lantern-room/workbench  vis(2,4)
  set{ small brass-cornered bench: leather tool roll, oil can, cotton rags,
       wick scissors }
  bg{ a rag stirs in the draft; the oil can's spout holds one slow bead }
ZONE:: lantern-room/floor  vis(1,3)
  set{ riveted iron plates, paint worn to bare metal along the walk-line }
  bg{ dust shivers across the plates with each gust }
ZONE:: gallery-outside  vis(1,3)
  set{ iron gallery rail OUTSIDE the glass, grey sea far below -- no birds ever
       inside the room }
  bg{ two gulls land outside on the exterior rail, fold their wings, and press
      against it to shelter, seen through the glass }
ZONE:: stairwell  vis(1)
  set{ spiral iron stair falling away into shadow, a rope handrail }
  bg{ his hand lantern glows below, left burning on a step }

SHOT 1 "The Climb" [8s]
  cam(slow push-in, 35mm, low angle from the stair hatch)
  act{ $BIBLE rises into the lantern room through the floor hatch, pauses,
       and looks first at the dark lamp, then at the storm front through
       the glass. $WORLD }
  lit(cold storm-sky key through the panes; his hand lantern warms him from below)
  aud{ boots on iron, wind rising around the tower, one far roll of thunder,
       gulls crying }
  sty{ maritime realism, muted film stock, the faintest sway as if the tower
       breathes }

SHOT 2 "Three Drops" [7s]  anc(hand lantern <- SHOT 1)
  cam(medium close-up, 50mm, over the workbench)
  act{ $BIBLE unrolls the leather tool roll without looking, threads a new
       wick with the scissors, and gives the mechanism exactly three slow
       drops from the oil can -- each drop catching the lantern light as it
       falls. $WORLD :lantern room }
  lit(hand-lantern key from the left; storm light cooling the background)
  aud{ leather unrolling, one scissor snip, three soft oil sounds, the first
       rain reaching the glass }
  sty{ same stock }

SHOT 3 "First Light" [8s]  anc(new wick <- SHOT 2)
  cam(wide, 24mm, locked off, the keeper small beside the great lens)
  act{ $BIBLE touches a slender lit taper to the new wick -- and the great
       lens wakes: rings of light sweep the room and out into the storm as
       the rain arrives in full. He steps back and simply watches. $WORLD }
  lit(the lamp becomes the sun of the room; far lightning answers out at sea)
  aud{ the taper's soft flare, the lamp's low whoomp, the beam's steady hum,
       full rain on the panes, the foghorn below }
  sty{ same stock }

SHOT 4 "Insert -- The Crack" [5s]  anc(lit lens <- SHOT 3)
  cam(macro insert, 100mm, extreme close-up, paper-thin focus, locked off)
  act{ his calloused thumb slides a cotton rag slowly along one intact glass
       prism with a single fine hairline seam inside it -- the seam fills
       with swimming lamplight under the cloth, dust lifting off the glass
       into the beam; the glass is whole, nothing is broken }
  lit(the lamp itself backlights the glass; the hairline seam glows like a
      vein of light inside solid glass)
  aud{ cloth squeaking on glass, the lamp's steady hum, rain muffled behind }
  sty{ same stock }
