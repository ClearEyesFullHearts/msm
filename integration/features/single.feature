Feature: Single Test

    For a single

Scenario: Unknown username returns an error
  When I GET /identity/Unknown
  Then response code should be 400
  And response body path $.code should be BAD_REQUEST_FORMAT

Scenario: WSS Signaling
  Given I am existing `RANDOM_USER.7`
  And I am existing `RANDOM_USER.10`
  And `RANDOM_USER.7` is connected
  And `RANDOM_USER.7` is listening
  And `RANDOM_USER.10` is connected
  And `RANDOM_USER.10` is listening
  When `RANDOM_USER.7` signals connected to `RANDOM_USER.10`
  Then `RANDOM_USER.10` last message action match signal
  Then `RANDOM_USER.10` last message signal match connected
  When `RANDOM_USER.7` signals start_session to `RANDOM_USER.10`
  Then `RANDOM_USER.10` last message action match signal
  Then `RANDOM_USER.10` last message signal match start_session
  Then `RANDOM_USER.10` last message session.token match ^[A-Za-z0-9+/]*(=|==)?$
  Then `RANDOM_USER.10` last message session.passphrase match ^[A-Za-z0-9+/]*(=|==)?$
  Then `RANDOM_USER.10` last message session.iv match ^[A-Za-z0-9+/]*(=|==)?$
  When `RANDOM_USER.7` signals disconnected to `RANDOM_USER.10`
  Then `RANDOM_USER.10` last message action match signal
  Then `RANDOM_USER.10` last message signal match disconnected
  When `RANDOM_USER.10` signals accept_session to `RANDOM_USER.7`
  Then `RANDOM_USER.7` last message action match signal
  Then `RANDOM_USER.7` last message signal match accept_session
  Then `RANDOM_USER.10` last message session.token match ^[A-Za-z0-9+/]*(=|==)?$
  Then `RANDOM_USER.10` last message session.passphrase match ^[A-Za-z0-9+/]*(=|==)?$
  Then `RANDOM_USER.10` last message session.iv match ^[A-Za-z0-9+/]*(=|==)?$