## ALDOUS
This is Aldous, BMUN's registration platform and the successor to our older model **Huxley**. We are running a React / Next.Js frontend, a Supabase backend, and are being hosted by Vercel.

## SET UP
Here's how to get it set up locally:
1. Clone the repository to a local directory:
```
git clone https://github.com/bmun/aldous.git
```
2. Install the requirements:
```
npm install
```
3. Build the project:
```
npm run build
```
4. Format the environment variables: Create a **.env.local** with the following format in the root of your project. Get the associated values from Nick (Or the current USG of Tech; update this if you haven't already).
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
6. IGNORE FOR NOW. THERE ARE SOME ISSUES WITH DOCKER. Set up the local supabase environment: If you do not already have a local container environment set up (like Docker) follow the one of the links at the top of https://supabase.com/docs/guides/local-development to download whichever one fits your device. Then, run the following commands. Your local supabase portal will be at: http://localhost:54323.<br>
```
npm install supabase --save-dev
npx supabase init
npx supabase start
```
7. Now you're cooking with gas: You should not have a fully functional version of Aldous running locally. Dive into some tickets and build!
