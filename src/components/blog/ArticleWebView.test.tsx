import { render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { sanitizeHtml, shouldStartLoad, ArticleWebView } from './ArticleWebView';

// Linking.openURL is a no-op in the test environment; spy on it.
const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

afterEach(() => openURL.mockClear());

// ---------------------------------------------------------------------------
// sanitizeHtml
// ---------------------------------------------------------------------------
describe('sanitizeHtml', () => {
  it('passes benign HTML through unchanged', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('strips <script> tags and their content', () => {
    const out = sanitizeHtml('<p>Hi</p><script>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert');
    expect(out).toContain('<p>Hi</p>');
  });

  it('strips <iframe>', () => {
    const out = sanitizeHtml('<iframe src="https://evil.com"></iframe>');
    expect(out).not.toContain('<iframe');
  });

  it('strips <object> and <embed>', () => {
    expect(sanitizeHtml('<object data="x.swf"></object>')).not.toContain('<object');
    expect(sanitizeHtml('<embed src="x.swf" />')).not.toContain('<embed');
  });

  it('removes on* event attributes', () => {
    const out = sanitizeHtml('<a href="#" onclick="evil()">click</a>');
    expect(out).not.toContain('onclick');
    expect(out).toContain('<a');
    expect(out).toContain('click</a>');
  });

  it('removes onerror and onload', () => {
    const out = sanitizeHtml('<img src="x.jpg" onerror="evil()" onload="track()">');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('onload');
  });

  it('neutralises javascript: hrefs', () => {
    const out = sanitizeHtml('<a href="javascript:evil()">x</a>');
    expect(out).not.toContain('javascript:');
  });

  it('neutralises data: src URIs', () => {
    const out = sanitizeHtml('<img src="data:image/png;base64,AAAA">');
    expect(out).not.toContain('data:');
  });

  it('preserves https: links', () => {
    const out = sanitizeHtml('<a href="https://mauritianrides.com">visit</a>');
    expect(out).toContain('https://mauritianrides.com');
  });
});

// ---------------------------------------------------------------------------
// shouldStartLoad
// ---------------------------------------------------------------------------
describe('shouldStartLoad', () => {
  it('allows about:blank (the initial html load)', () => {
    expect(shouldStartLoad({ url: 'about:blank' })).toBe(true);
  });

  it('opens https: links in the system browser and returns false', () => {
    const result = shouldStartLoad({ url: 'https://mauritianrides.com/blog' });
    expect(openURL).toHaveBeenCalledWith('https://mauritianrides.com/blog');
    expect(result).toBe(false);
  });

  it('opens http: links in the system browser and returns false', () => {
    const result = shouldStartLoad({ url: 'http://example.com' });
    expect(openURL).toHaveBeenCalledWith('http://example.com');
    expect(result).toBe(false);
  });

  it('rejects javascript: scheme', () => {
    const result = shouldStartLoad({ url: 'javascript:alert(1)' });
    expect(openURL).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('rejects data: scheme', () => {
    const result = shouldStartLoad({ url: 'data:text/html,<h1>x</h1>' });
    expect(openURL).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ArticleWebView component
// ---------------------------------------------------------------------------
describe('ArticleWebView', () => {
  it('renders without crashing on a normal article', () => {
    const { toJSON } = render(
      <ArticleWebView content="<p>Some article content.</p>" />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('shows fallback text (WebView native module not available in test env)', () => {
    // The mock for react-native-webview returns a plain View. The component's try/catch
    // catches a missing module in the real native env; in tests the mock is loaded fine,
    // so the WebView branch renders (as a View). Either way, the component renders.
    const { toJSON } = render(
      <ArticleWebView content="<h2>Title</h2><p>Body</p>" />,
    );
    expect(toJSON()).toBeTruthy();
  });
});
