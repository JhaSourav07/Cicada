# Local SearXNG Setup & Configuration

This guide details the deployment of SearXNG as an isolated, rootless container on Fedora Linux using systemd Quadlets.

---

## 1. Why SearXNG for CICADA?

1. **Zero Tracking & Maximum Privacy**: SearXNG is a free metasearch engine that aggregates results from dozens of search services (Google, DuckDuckGo, Bing, Wikipedia, Qwant, etc.) without logging IP addresses, profiling queries, or sharing identifiers.
2. **Local Loopback Only**: Runs strictly on `127.0.0.1:8080`, entirely inaccessible to external networks or LAN clients.
3. **Structured JSON Output**: Natively supports `format=json` for machine retrieval.
4. **No API Keys or Paid Subscriptions**: Completely self-hosted and cost-free.

---

## 2. Podman Quadlet Deployment

CICADA manages SearXNG as a systemd user service via a Quadlet file located at:
`~/.config/containers/systemd/cicada-searxng.container`

```ini
[Unit]
Description=CICADA Rootless SearXNG Metasearch Engine
After=network-online.target

[Container]
ContainerName=cicada-searxng
Image=docker.io/searxng/searxng:latest
PublishPort=127.0.0.1:8080:8080
Volume=%h/.config/containers/cicada-searxng/settings.yml:/etc/searxng/settings.yml:Z
Environment=SEARXNG_BASE_URL=http://127.0.0.1:8080/
SecurityLabelDisable=false

[Install]
WantedBy=default.target
```

### Key Security Flags:
- `PublishPort=127.0.0.1:8080:8080`: Binds exclusively to the loopback interface.
- `:Z`: Directs SELinux to configure a private unshared relabeling for the mounted volume.
- Rootless user namespace: The container runs within the user's unprivileged namespace (subuid `525264`).

---

## 3. Configuration (`settings.yml`)

The configuration file is maintained at `~/.config/containers/cicada-searxng/settings.yml`:

```yaml
use_default_settings: true

general:
  debug: false
  instance_name: "CICADA Local Search"
  contact_url: "mailto:cicada@127.0.0.1"

server:
  port: 8080
  bind_address: "0.0.0.0"
  secret_key: "<SECURE_32_BYTE_HEX_KEY>"
  limiter: false
  image_proxy: false

search:
  safe_search: 0
  autocomplete: ""
  default_lang: "auto"
  formats:
    - html
    - json

engines:
  - name: google
    engine: google
    shortcut: g
  - name: duckduckgo
    engine: duckduckgo
    shortcut: ddg
  - name: wikipedia
    engine: wikipedia
    shortcut: wp
```

### Important Settings Explained:
- `server.limiter: false`: Disables rate limiting so CICADA's local backend can issue rapid concurrent queries without receiving HTTP 429 errors.
- `search.formats: [html, json]`: Enables JSON response rendering required for API consumers.
- `general.contact_url`: Required by Wikidata and OpenStreetMap upstream engines to prevent initialization crashes.

---

## 4. Operational Commands

### Reloading systemd & Starting Service
```bash
systemctl --user daemon-reload
systemctl --user restart cicada-searxng.service
systemctl --user status cicada-searxng.service
```

### Inspecting Container Logs
```bash
podman logs -f cicada-searxng
```

### Health Verification
```bash
curl -s "http://127.0.0.1:8080/search?q=fedora+linux&format=json" | jq '.results | length'
```
