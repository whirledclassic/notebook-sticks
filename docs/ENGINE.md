# ScribbleEngine

Custom multiplayer loop for Notebook Sticks.

Server ticks every 50ms and sends one snapshot per page. Clients render other people 90ms in the past and interpolate between snapshots. Local walk stays instant.

Moves are speed-clamped so a bad client cannot teleport. Chat, poses, looks, and page turns stay event messages.
