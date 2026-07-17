# Deploying to Alibaba Cloud ECS

This guide takes Compliance Autopilot from zero to a public URL on Alibaba
Cloud, satisfying the hackathon's deployment requirement. Total time:
roughly 20 minutes, most of it waiting on the console.

## 1. Create the ECS instance

1. Sign in at [ecs.console.aliyun.com](https://ecs.console.aliyun.com) and
   click **Create Instance**.
2. Recommended settings:
   - **Billing:** Pay-as-you-go (new accounts often have free trial credit).
   - **Region:** Singapore (ap-southeast-1) or whichever is closest to you.
   - **Instance type:** `ecs.e-c1m2.large` (2 vCPU / 4 GiB) or any type with
     at least 2 GiB RAM — Docker builds need the headroom.
   - **Image:** Ubuntu 24.04 (or 22.04) 64-bit.
   - **System disk:** 40 GiB default is fine.
   - **Public IP:** Assign automatically (or bind an Elastic IP).
   - **Logon:** Key pair (create one and download the `.pem`) — avoid
     password logon.
3. In the **Security Group**, open inbound ports:
   - `22/tcp` (SSH — restrict to your own IP if possible)
   - `80/tcp` (frontend)
   - `8000/tcp` (backend API + deployment-proof endpoint for judges)

## 2. Deploy

SSH in and run the deploy script with your Qwen Cloud key:

```bash
ssh -i your-key.pem root@<ecs-public-ip>

export DASHSCOPE_API_KEY=sk-...
curl -fsSL https://raw.githubusercontent.com/adetorojeremiahfadesayo/Compliance-AI-Scanner/main/deploy/alibaba-ecs.sh | bash
```

The script installs Docker, clones this repository, writes the environment
file, builds both containers, and prints the public URLs when the backend
reports healthy. Re-running it later pulls the latest code and restarts.

## 3. Verify

- App: `http://<ecs-public-ip>/`
- API docs: `http://<ecs-public-ip>:8000/docs`
- Deployment proof: `http://<ecs-public-ip>:8000/api/deployment-proof` —
  returns the provider, Qwen base URL, model names, and confirms the API
  key is configured. This is the endpoint to show judges.

## 4. Hackathon evidence checklist

- [ ] Short screen recording (separate from the demo video) showing the ECS
      console with the running instance, then the app and
      `/api/deployment-proof` loading from the public IP.
- [ ] On the Devpost form, link the Alibaba Cloud usage code:
      the Qwen client (`backend/app/services/qwen_client.py`) and this
      deploy script (`deploy/alibaba-ecs.sh`).
- [ ] Screenshot of a completed scan showing "Qwen Cloud" as the model
      provider.
