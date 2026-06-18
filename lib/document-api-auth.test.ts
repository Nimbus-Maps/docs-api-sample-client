describe('Document API auth resolver', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns the delegated session token in OBO mode', async () => {
    const requireAuth = jest.fn().mockResolvedValue({
      accessToken: 'user-token',
      expiresAt: 123,
      isAuthenticated: true,
    });

    jest.doMock('./env', () => ({
      env: {
        DOCUMENT_API_AUTH_MODE: 'obo',
      },
    }));
    jest.doMock('./session', () => ({ requireAuth }));
    jest.doMock('./client-credentials-token', () => ({
      getClientCredentialsToken: jest.fn(),
    }));

    const { requireDocumentApiAuth } = await import('./document-api-auth');
    const auth = await requireDocumentApiAuth();

    expect(auth).toMatchObject({
      accessToken: 'user-token',
      expiresAt: 123,
      mode: 'obo',
    });
    expect(requireAuth).toHaveBeenCalled();
  });

  it('returns the app token in client credentials mode', async () => {
    const getClientCredentialsToken = jest.fn().mockResolvedValue({
      accessToken: 'app-token',
      expiresAt: 456,
    });

    jest.doMock('./env', () => ({
      env: {
        DOCUMENT_API_AUTH_MODE: 'client_credentials',
      },
    }));
    jest.doMock('./session', () => ({ requireAuth: jest.fn() }));
    jest.doMock('./client-credentials-token', () => ({ getClientCredentialsToken }));

    const { requireDocumentApiAuth } = await import('./document-api-auth');
    const auth = await requireDocumentApiAuth();

    expect(auth).toEqual({
      accessToken: 'app-token',
      expiresAt: 456,
      mode: 'client_credentials',
    });
    expect(getClientCredentialsToken).toHaveBeenCalled();
  });
});
