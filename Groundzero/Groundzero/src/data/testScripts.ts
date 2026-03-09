// Sample test scripts for testing the script breakdown functionality

export const TEST_SCRIPTS = [
  {
    id: 'short-film',
    name: 'The Last Light (Short Film)',
    description: 'A 3-scene short film about hope',
    language: 'English',
    content: `FADE IN:

INT. ABANDONED WAREHOUSE - NIGHT

The vast space is illuminated only by moonlight streaming through broken windows. MAYA (30s, weathered but determined) crouches behind a stack of crates, clutching a worn leather journal.

MAYA
(whispering)
Three more hours until dawn.

She checks her watch, then peers around the crate. In the distance, we see SHADOWS moving.

MAYA (CONT'D)
They're getting closer.

Maya pulls out a small flashlight and a map from her bag.

INT. ABANDONED WAREHOUSE - CONTINUOUS

Maya spreads the map on the ground. Her fingers trace a route marked in red.

MAYA
(to herself)
The bridge. It's the only way.

A SOUND echoes through the warehouse. Maya freezes.

MYSTERIOUS VOICE (O.S.)
You can't run forever, Maya.

Maya quickly gathers her things and moves to the shadows.

EXT. CITY ROOFTOP - DAWN

Maya emerges onto a rooftop, the first rays of sunlight painting the sky orange and pink. She looks out over the destroyed cityscape.

MAYA
(with hope)
We made it.

She opens the journal and writes.

MAYA (V.O.)
Day 47. Found the route to the safe zone. Tomorrow, we begin again.

The camera pulls back to reveal the massive scope of the ruined city below.

FADE OUT.

THE END`
  },
  {
    id: 'action-sequence',
    name: 'Chase Through Mumbai',
    description: 'An action sequence with multiple locations and VFX',
    language: 'English',
    content: `FADE IN:

EXT. MUMBAI STREETS - DAY

Chaos. Cars. People. The cacophony of a million lives in motion.

AGENT SINGH (40s, sharp eyes, impeccable suit despite the heat) bursts through a fruit vendor's stall. Mangoes fly everywhere.

VENDOR
Hey! You pay for that!

Singh doesn't look back. He's focused on the figure ahead - THE TARGET, a man in a black hoodie weaving through the crowd.

AGENT SINGH
(into earpiece)
Target heading north on M.G. Road. Need aerial support.

CONTROL (V.O.)
Copy that. Drone is 30 seconds out.

Singh vaults over a motorcycle, lands rolling, and continues the chase.

INT. MUMBAI LOCAL TRAIN - MOVING - CONTINUOUS

The Target leaps onto a moving train through an open door. Singh follows, barely making it.

Inside, passengers gasp and scatter. The Target pushes through the packed carriage.

Singh draws his weapon but can't get a clear shot. Too many civilians.

AGENT SINGH
Everyone down!

The Target reaches the end of the carriage and JUMPS to the roof.

EXT. TRAIN ROOF - CONTINUOUS

Wind whips past as Singh climbs up. The Mumbai skyline rushes by. The Target is running across the train roofs.

CONTROL (V.O.)
Drone in position. We have visual.

AGENT SINGH
Don't lose him!

The Target LEAPS across a gap between trains. Singh hesitates, then follows.

VFX: Wide shot of Mumbai's sprawling railway network, the two figures tiny against the urban landscape.

The Target stops at the edge of the last car, looking down at the Mahim Creek passing below.

AGENT SINGH (CONT'D)
It's over. There's nowhere left to run.

THE TARGET
(turning, smiling)
Who said anything about running?

The Target JUMPS off the train.

Singh rushes to the edge to see - a SPEEDBOAT below, catching The Target perfectly.

AGENT SINGH
(frustrated)
I need marine units at Mahim Creek. NOW!

SMASH CUT TO BLACK.`
  },
  {
    id: 'drama-dialogue',
    name: 'Family Reunion',
    description: 'An emotional drama scene with complex dialogue',
    language: 'English',
    content: `INT. FAMILY HOME - LIVING ROOM - EVENING

A modest but warm living room. Family photos line the walls, telling stories of happier times. ROBERT (60s, tired, carrying the weight of unspoken words) sits in his armchair, staring at an old photograph.

The front door opens. SARAH (35, Robert's daughter, dressed for corporate success but with eyes that reveal old wounds) enters hesitantly.

SARAH
Dad?

Robert doesn't turn around.

ROBERT
Your mother's roses are dying. She'd hate that.

SARAH
(sitting across from him)
I know. I saw them.

A long silence. The grandfather clock ticks loudly.

SARAH (CONT'D)
You called me. You said it was important.

ROBERT
(finally looking at her)
I'm selling the house.

SARAH
(shocked)
What? No. This is mom's house. This is OUR house.

ROBERT
It's just walls and memories now, Sarah. Your brother's in California. You're in the city. What am I holding onto?

SARAH
Forty years, Dad. Forty years of our lives are in these walls.

Robert stands, moves to the window where dying roses are visible.

ROBERT
Your mother could make anything grow. I can't even keep her garden alive.

SARAH
(softening)
You're not supposed to do it alone.

ROBERT
(turning)
I've been alone since she died, Sarah. You stopped coming. You stopped calling. Christmas cards aren't the same as family.

SARAH
(defensive)
I've been busy. The firm--

ROBERT
(cutting her off)
--The firm. Always the firm. You know what your mother said, right before the end?

Sarah shakes her head, tears forming.

ROBERT (CONT'D)
She said, "Don't let her make the same mistakes I did. Don't let her choose work over love."

SARAH
(crying)
I'm here now.

ROBERT
(gently)
I know. I know you are.

He opens his arms. Sarah hesitates, then crosses the room to embrace him. They hold each other as years of silence begin to heal.

ROBERT (CONT'D)
(whispering)
I'm not selling the house. I just... I needed you to come home.

SARAH
(laughing through tears)
You manipulative old man.

ROBERT
Learned from the best. Your mother.

They both look at her photograph on the mantle.

FADE TO BLACK.`
  }
];

export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'hi', name: 'Hindi (हिंदी)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
];
