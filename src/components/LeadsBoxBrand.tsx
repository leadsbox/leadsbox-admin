type LeadsBoxBrandProps = {
  compact?: boolean;
};

const LeadsBoxBrand = ({ compact = false }: LeadsBoxBrandProps) => {
  return (
    <span className={`brand-mark ${compact ? 'brand-mark-compact' : ''}`}>
      <span className='brand-logo-wrap'>
        <img src='/leadsboxlogo.svg' alt='LeadsBox' className='brand-logo' />
      </span>
      {!compact ? (
        <span className='brand-copy'>
          <strong>LeadsBox</strong>
          <small>Admin Console</small>
        </span>
      ) : null}
    </span>
  );
};

export default LeadsBoxBrand;
