import { serveStatic } from '@hono/node-server/serve-static'
import { type NeynarVariables, neynar } from 'frog/middlewares'
import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import dotenv from 'dotenv'
import { sql } from '@vercel/postgres';

dotenv.config({ path: './.env.local' });

export const app = new Frog<{ 
  Variables: NeynarVariables
}>({
  imageOptions: { height: 500, width: 955},
  assetsPath: '/',
  basePath: '/api',
})

let isActive = true; // Need to set to pull from somewhere

app.use('/*', serveStatic({ root: './public' }))

app.use(
  neynar({
    apiKey: process.env.NEYNAR_API_KEY || 'NEYNAR_FROG_FM', // Provide a default value,
    features: ['interactor', 'cast'],
  }),
)

app.frame('/', (c) => {
  return c.res({
    action: isActive ? '/submit' : '/inactive',
    image: '/0.png',
    // imageAspectRatio: '1:1',
    intents: [
      // <TextInput placeholder="Enter custom fruit..." />,
      <Button value="Option 1">Option 1</Button>,
      <Button value="Option 2">Option 2</Button>,
      <Button value="Option 3">Option 3</Button>,
      <Button value="Option 4">Option 4</Button>
    ],
  })
})

app.frame('/submit', async (c) => {
  const { buttonValue } = c;
  const userFid = c.frameData?.fid;
  const likes = c.var.cast?.reactions.likes || [];
  const userLiked = likes.some(like => like.fid === userFid);

  if (userLiked) {
    console.log(`INSERT INTO button_clicks(user_fid, button_value, timestamp) VALUES (${userFid}, ${buttonValue}, NOW())`)

    try {
      await sql`INSERT INTO button_clicks(user_fid, button_value, timestamp) VALUES (${userFid}, ${buttonValue}, NOW())`;
    } catch (error) {
      console.error('Postgres Error:', error);
    }
  }

  // Query the database for the count of each button option
  const options = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
  const counts = await Promise.all(
    options.map(async (option) => {
      const { rows } = await sql`SELECT COUNT(*) as count FROM button_clicks WHERE button_value=${option}`;
      return rows[0].count;
    })
  );

  // Construct the HTML response
  const html = (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'white', fontSize: 60, width: '100%' }}>
        {options.map((option, index) => (
          <div key={option} style={{ width: '100%', display: 'flex' }}>
            {option}: {counts[index]}
          </div>
        ))}
      </span>
    </div>
  );

  return c.res({
    // image: userLiked ? html : '/likepls.png',
    image: userLiked ? '/thankyou.png' : '/likepls.png',
    intents: userLiked ? [
      <Button.Link href="https://warpcast.com/ok">Ext Link 1</Button.Link>,
      <Button.Link href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Ext Link 2</Button.Link>,
    ] : [
      <Button.Reset>← Back Link</Button.Reset>,
    ],
  });
});

app.frame('/inactive', (c) => {
  return c.res({
    image: '/comebacktom.png',
    intents: [
      <Button.Link href="https://warpcast.com/ok">Ext Link 1</Button.Link>,
      <Button.Link href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Ext Link 2</Button.Link>,
    ],
  })
});


export const GET = handle(app)
export const POST = handle(app)
