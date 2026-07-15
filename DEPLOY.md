# Deploying Etidhi Work OS

The app stores its data on disk — the SQLite database and uploaded bill photos both
live in the `data/` folder. So it needs a host with **persistent storage**. This guide
covers the free option (Oracle Cloud) and a paid one-click option (Railway).

Whichever you pick, two things are required in production:

1. **Set `AUTH_SECRET`** — a long random string that signs login cookies. One has been
   generated for you (see below). Keep it secret; if it changes, everyone gets logged out.
2. **Back up the `data/` folder** — it contains all your data, including financial
   reimbursement records and bill photos. See "Backups" at the bottom.

Your generated production secret (store it in a password manager, don't commit it):

```
AUTH_SECRET=aN-AWaG7QiaRPi47cpdGJnjzM05XxufK7mN-mKhSwxCgNzLlmMNtXRVq9r-QJ3GA
```

The app is packaged with a `Dockerfile`, so any container host runs it identically.

---

## Option A — Oracle Cloud "Always Free" (free forever)

A real Linux VPS that's free permanently (not a trial). The app runs as-is.

### 1. Create the server
- Sign up at https://www.oracle.com/cloud/free/ (a card is required for identity
  verification, but Always Free resources are never charged).
- Create a **Compute instance**: shape `VM.Standard.A1.Flex` (ARM, Always Free),
  image **Ubuntu 22.04**. Download the SSH key when prompted.
- Under the instance's VCN → Security List, add an **Ingress rule** allowing TCP
  ports **80** and **443** from `0.0.0.0/0`.

### 2. Point your domain
In your `etidhi.in` DNS provider, add an **A record**:

| Type | Name  | Value                         |
|------|-------|-------------------------------|
| A    | `app` | *(the instance's public IP)*  |

This makes the app reachable at **app.etidhi.in**.

### 3. Install Docker and run the app
SSH in (`ssh -i your-key ubuntu@<public-ip>`), then:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Get the code (push it to GitHub first, or scp the folder up)
git clone <your-repo-url> etidhi && cd etidhi

# Build the image
sudo docker build -t etidhi .

# Run it, with a persistent volume for data and the secret set
sudo docker run -d --name etidhi --restart unless-stopped \
  -p 3000:3000 \
  -v /home/ubuntu/etidhi-data:/app/data \
  -e AUTH_SECRET='aN-AWaG7QiaRPi47cpdGJnjzM05XxufK7mN-mKhSwxCgNzLlmMNtXRVq9r-QJ3GA' \
  etidhi
```

The `-v` flag maps the app's `data/` folder to `/home/ubuntu/etidhi-data` on the
server, so your database and bill photos survive restarts and redeploys.

### 4. Add HTTPS with Caddy (automatic free certificate)
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Put this in `/etc/caddy/Caddyfile`:

```
app.etidhi.in {
    reverse_proxy localhost:3000
}
```

Then `sudo systemctl reload caddy`. Caddy fetches a Let's Encrypt certificate
automatically. Visit **https://app.etidhi.in** — you're live.

### Redeploying after code changes
```bash
cd etidhi && git pull
sudo docker build -t etidhi .
sudo docker rm -f etidhi
# re-run the same `docker run …` command from step 3 (data is preserved by the volume)
```

---

## Option B — Railway (paid, ~$5/mo, ~15 minutes, no server admin)

If you'd rather not manage a server, Railway is the simplest path and handles
durability for you.

1. Push this project to a GitHub repo.
2. On https://railway.app → **New Project → Deploy from GitHub repo**. It detects the
   Dockerfile automatically.
3. Add a **Volume** mounted at `/app/data` (Railway → service → Variables/Volumes).
4. Add a variable `AUTH_SECRET` = the secret above.
5. Under **Settings → Networking → Custom Domain**, add `app.etidhi.in`. Railway shows
   a `CNAME` target — add it as a CNAME record for `app` in your `etidhi.in` DNS.

Done. Railway rebuilds and redeploys automatically on every `git push`.

---

## Backups (do this regardless of host)

Your entire app state is the `data/` folder. Back it up on a schedule.

On the Oracle VPS, this cron line makes a daily timestamped copy:

```bash
# crontab -e   →   add:
0 2 * * * tar czf /home/ubuntu/backups/etidhi-$(date +\%F).tgz -C /home/ubuntu etidhi-data
```

For off-server safety, periodically download those `.tgz` files, or push them to a
cloud bucket. Because the app holds financial reimbursement records, treat these
backups as important business records.

---

## First-run notes
- On first start the app auto-creates the database and seeds demo accounts
  (see `README.md`). **Change the seeded passwords** or remove the demo users from the
  Team page once your real team is set up.
- All sign-in emails must end in `@etidhi.in`.
