# Drills - simulacros

Planifica simulacros, registra **check-ins en vivo** (tiempo de evacuacion + pasos) y
calcula un **puntaje de preparacion 0-100** (participacion 50% + tiempo 35% + pasos 15%).

## Endpoints
- `GET /drills` / `POST /drills`
- `POST /drills/:id/start`
- `POST /drills/:id/checkin` - { participantId, evacSeconds, completedSteps }
- `POST /drills/:id/finish` - calcula score
- `GET /drills/:id/results`
- `GET /health`
