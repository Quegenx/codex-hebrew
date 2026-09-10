import {createIntl, createIntlCache} from 'react-intl';
import {installRTL} from './rtl-adapter.js';
import {installStyles} from './stylesheet-adapter.js';
import {installDirection} from './direction-context.js';

// Version-sensitive experiment: locates the observed IntlProvider class instance.
// It changes in-memory state only, never app files, settings or conversations.
window.installChatGPTHebrew = function(options) {
  window.chatgptHebrew?.stop();
  const providers = new Map();
  const watchLocaleProvider=options.platform==='win32';
  const cache = createIntlCache();
  let disposed = false;
  let timer = null;
  let status = 'waiting-for-provider';
  let direction={status:()=>({state:'loading'}),stop(){}};
  const styles=installStyles(options.styles);
  const rtl = installRTL({platform:options.platform,css:options.css,locale:options.locale || 'he',translations:options.translations,directionalIcons:options.directionalIcons||options.direction?.directionalIcons});
  function apply() {
    const root = window.__codexRoot?._internalRoot?.current;
    if (!root) {status='unsupported-react-root';return;}
    const stack = [root];let visited=0;
    while (stack.length && visited++ < 30000) {
      const fiber = stack.pop();
      const instance = fiber.stateNode;
      const current = instance?.state?.intl;
      if (fiber.tag === 1 && current?.formatMessage && instance.state.prevConfig && typeof instance.setState === 'function') {
        const prior = providers.get(instance);
        if (!prior || current !== prior.replacement) {
          const replacement = createIntl({
            ...instance.props,
            locale:options.locale || 'he',
            messages:{...current.messages,...options.translations},
            onError(error) {if (error.code !== 'MISSING_TRANSLATION') status='format-error';},
          },cache);
          providers.set(instance,{original:current,replacement});
          instance.setState({intl:replacement});
        }
      }
      if (fiber.child) stack.push(fiber.child);
      if (fiber.sibling) stack.push(fiber.sibling);
    }
    if (providers.size) {
      status='attached';
      if (!watchLocaleProvider && timer !== null) {clearInterval(timer);timer=null;}
    }
    styles.apply();
  }
  void installDirection(options.direction).then(next=>{if(disposed){next.stop();return;}direction=next;for(const instance of providers.keys())instance.forceUpdate();apply();}).catch(()=>{direction={status:()=>({state:'unsupported'}),stop(){}};});
  apply();
  // The pinned Windows runtime replaces IntlProvider after async locale loading.
  // Mac discovery stops after attachment; Windows scans at most 30,000 fibers
  // every 500 ms until stop(). A provider lifecycle subscription can replace it.
  if(watchLocaleProvider||status!=='attached')timer=setInterval(()=>{if(!disposed)apply();},watchLocaleProvider?500:250);
  const api={
    status(){return {version:2,status,providers:providers.size,polling:timer!==null,postRenderTranslations:false,rtl:rtl.status(),direction:direction.status(),styles:styles.status(),catalogSize:Object.keys(options.translations).length};},
    stop(){disposed=true;if(timer!==null)clearInterval(timer);timer=null;styles.stop();direction.stop();rtl.stop();for(const [instance,p] of providers)if(instance.state?.intl===p.replacement)instance.setState({intl:p.original});providers.clear();if(window.chatgptHebrew===api)delete window.chatgptHebrew;},
  };
  window.chatgptHebrew=api;return api.status();
};
